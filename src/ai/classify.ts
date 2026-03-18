import type { BookmarkNode, CategorySkeleton, ClassifyResult, CategoryGroup } from '@/types';
import { chatCompletion, parseJsonResponse } from './client';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('ai-classify');
const BATCH_SIZE = 100;

// --- 简化书签数据，减少 token 消耗 ---

interface SlimBookmark {
  id: string;
  title: string;
  url: string;
  folder: string;
}

function flattenBookmarks(
  nodes: BookmarkNode[],
  parentPath = '',
): SlimBookmark[] {
  const result: SlimBookmark[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.title}` : node.title;
    if (node.url) {
      result.push({ id: node.id, title: node.title, url: node.url, folder: parentPath });
    }
    if (node.children) {
      result.push(...flattenBookmarks(node.children, path));
    }
  }
  return result;
}

// --- 第一步：生成分类骨架（支持最多两级）---

async function generateSkeleton(
  bookmarks: SlimBookmark[],
): Promise<CategorySkeleton[]> {
  const sample = bookmarks.slice(0, 200);
  const prompt = `你是一个书签分类专家。根据以下书签列表，生成一个合理的分类方案。

要求：
- 一级分类数量控制在 5-15 个
- 每个一级分类可以包含子分类（subCategories），子分类数量控制在 2-8 个
- 最多两级分类结构，不要更深层级
- 如果某个一级分类下的书签主题单一，可以不设子分类（subCategories 为空数组）
- 每个分类有清晰的名称和简短描述
- 分类之间不重叠
- 返回 JSON 数组格式：[{"name": "分类名", "description": "描述", "subCategories": [{"name": "子分类名", "description": "描述"}]}]

书签列表：
${JSON.stringify(sample, null, 0)}`;

  const response = await chatCompletion([
    { role: 'system', content: '你是书签分类助手，只返回 JSON，不要其他内容。' },
    { role: 'user', content: prompt },
  ]);

  return parseJsonResponse<CategorySkeleton[]>(response);
}

// --- 第二步：分批归类（支持子分类）---

interface BatchAssignment {
  bookmarkId: string;
  category: string;
  subCategory: string | null;
}

interface BatchClassifyResult {
  assignments: BatchAssignment[];
  uncategorized: string[];
}

function buildCategoryPromptList(categories: CategorySkeleton[]): string {
  return categories
    .map((c) => {
      const subs = c.subCategories?.length
        ? c.subCategories.map((s) => `    - ${s.name}: ${s.description}`).join('\n')
        : '    （无子分类）';
      return `- ${c.name}: ${c.description}\n${subs}`;
    })
    .join('\n');
}

async function classifyBatch(
  bookmarks: SlimBookmark[],
  categories: CategorySkeleton[],
): Promise<BatchClassifyResult> {
  const categoryList = buildCategoryPromptList(categories);

  const prompt = `将以下书签归入对应分类。

可用分类（最多两级）：
${categoryList}

书签列表：
${JSON.stringify(bookmarks, null, 0)}

要求：
- 每个书签归入最合适的一个分类
- 如果该一级分类有子分类，必须同时指定 subCategory；如果没有子分类，subCategory 设为 null
- 无法确定的放入 uncategorized
- 返回 JSON：{"assignments": [{"bookmarkId": "id", "category": "一级分类名", "subCategory": "子分类名或null"}], "uncategorized": ["id1", "id2"]}`;

  const response = await chatCompletion([
    { role: 'system', content: '你是书签分类助手，只返回 JSON，不要其他内容。' },
    { role: 'user', content: prompt },
  ]);

  return parseJsonResponse<BatchClassifyResult>(response);
}

// --- 组装结果：将分批归类结果聚合为 CategoryGroup[] ---

function buildCategoryGroups(
  skeleton: CategorySkeleton[],
  assignmentMap: Map<string, Map<string | null, BookmarkNode[]>>,
): CategoryGroup[] {
  return skeleton
    .map((s): CategoryGroup | null => {
      const subMap = assignmentMap.get(s.name);
      if (!subMap) return null;

      // 收集直接归入一级分类的书签（subCategory 为 null）
      const directBookmarks = subMap.get(null) ?? [];

      // 构建子分组
      const subGroups: CategoryGroup[] = (s.subCategories ?? [])
        .map((sub): CategoryGroup | null => {
          const subBookmarks = subMap.get(sub.name) ?? [];
          return subBookmarks.length > 0
            ? { id: crypto.randomUUID(), name: sub.name, bookmarks: subBookmarks }
            : null;
        })
        .filter((g): g is CategoryGroup => g !== null);

      const totalCount = directBookmarks.length
        + subGroups.reduce((sum, g) => sum + g.bookmarks.length, 0);
      if (totalCount === 0) return null;

      return {
        id: crypto.randomUUID(),
        name: s.name,
        bookmarks: directBookmarks,
        ...(subGroups.length > 0 ? { subGroups } : {}),
      };
    })
    .filter((g): g is CategoryGroup => g !== null);
}

// --- 完整分类流程 ---

export async function runClassify(
  bookmarksTree: BookmarkNode[],
): Promise<ClassifyResult> {
  const allBookmarks = flattenBookmarks(bookmarksTree);
  logger.info('Starting classification', { total: allBookmarks.length });

  // 第一步：生成骨架
  const skeleton = await generateSkeleton(allBookmarks);
  logger.info('Skeleton generated', { categories: skeleton.length });

  // 构建 id → BookmarkNode 索引
  const nodeIndex = new Map<string, BookmarkNode>();
  function indexNodes(nodes: BookmarkNode[]) {
    for (const n of nodes) {
      if (n.url) nodeIndex.set(n.id, n);
      if (n.children) indexNodes(n.children);
    }
  }
  indexNodes(bookmarksTree);

  // 构建有效分类名集合（用于校验 AI 返回值）
  const validCategories = new Set(skeleton.map((s) => s.name));
  const validSubCategories = new Map<string, Set<string>>();
  for (const s of skeleton) {
    if (s.subCategories?.length) {
      validSubCategories.set(s.name, new Set(s.subCategories.map((sc) => sc.name)));
    }
  }

  // assignmentMap: 一级分类名 → (子分类名|null → BookmarkNode[])
  const assignmentMap = new Map<string, Map<string | null, BookmarkNode[]>>();
  const uncategorizedIds = new Set<string>();

  // 第二步：分批处理
  for (let i = 0; i < allBookmarks.length; i += BATCH_SIZE) {
    const batch = allBookmarks.slice(i, i + BATCH_SIZE);
    const result = await classifyBatch(batch, skeleton);

    for (const a of result.assignments) {
      const node = nodeIndex.get(a.bookmarkId);
      if (!node || !validCategories.has(a.category)) {
        if (node) uncategorizedIds.add(a.bookmarkId);
        continue;
      }

      // 校验子分类有效性
      const subSet = validSubCategories.get(a.category);
      const subKey = (a.subCategory && subSet?.has(a.subCategory))
        ? a.subCategory
        : null;

      if (!assignmentMap.has(a.category)) {
        assignmentMap.set(a.category, new Map());
      }
      const subMap = assignmentMap.get(a.category)!;
      if (!subMap.has(subKey)) subMap.set(subKey, []);
      subMap.get(subKey)!.push(node);
    }

    for (const id of result.uncategorized) {
      uncategorizedIds.add(id);
    }

    logger.info('Batch classified', { batch: i / BATCH_SIZE + 1 });
  }

  // 第三步：组装结果
  const categories = buildCategoryGroups(skeleton, assignmentMap);

  const uncategorized = [...uncategorizedIds]
    .map((id) => nodeIndex.get(id))
    .filter((n): n is BookmarkNode => !!n);

  logger.info('Classification complete', {
    categories: categories.length,
    uncategorized: uncategorized.length,
  });

  return { categories, uncategorized };
}
