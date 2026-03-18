import type { ClassifyResult, BookmarkNode, CategoryGroup } from '@/types';
import { getFullTree, getSubTree } from '@/bookmarks';
import { createSnapshot } from '@/storage/snapshots';
import { ensureAiConfigured } from '@/ai/client';
import { runClassify } from '@/ai/classify';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('bg-classify');

// --- 启动分类 ---

export async function handleClassifyStart(
  folderIds: string[],
): Promise<ClassifyResult> {
  // 校验 AI 配置
  const check = await ensureAiConfigured();
  if (!check.ready) throw new Error(check.error.message);

  // 读取书签树
  let bookmarksTree: BookmarkNode[];
  if (folderIds.length === 0) {
    bookmarksTree = await getFullTree();
  } else {
    const trees = await Promise.all(folderIds.map(getSubTree));
    bookmarksTree = trees.flat();
  }

  logger.info('Classification started', { folderIds });

  // 调用 AI 分类
  const result = await runClassify(bookmarksTree);
  logger.info('Classification result ready', {
    categories: result.categories.length,
    uncategorized: result.uncategorized.length,
  });

  return result;
}

// --- 应用分类结果 ---

export async function handleClassifyApply(
  result: ClassifyResult,
  scopeIds: string[],
): Promise<void> {
  // 先读取当前状态用于快照
  let currentTree: BookmarkNode[];
  if (scopeIds.length === 0) {
    currentTree = await getFullTree();
  } else {
    const trees = await Promise.all(scopeIds.map(getSubTree));
    currentTree = trees.flat();
  }

  // 创建快照
  const scope = scopeIds.length === 0 ? '全部书签' : scopeIds.join(',');
  try {
    await createSnapshot('ai_reorganize', scope, currentTree);
  } catch (err) {
    logger.error('Snapshot failed, aborting classify apply', { err });
    throw new Error('快照创建失败，已阻止写入操作。请检查存储空间后重试。');
  }

  // 写入书签结构
  await applyClassifyResult(result, scopeIds);
  logger.info('Classification applied');
}

// --- 写入分类结果到书签树 ---

async function applyClassifyResult(
  result: ClassifyResult,
  scopeIds: string[],
): Promise<void> {
  // 确定父级目录和清空范围
  const parentId = scopeIds.length > 0 ? scopeIds[0] : '1';

  // 先清空范围内的旧结构
  if (scopeIds.length === 0) {
    // 全部书签：清空书签栏和其他书签
    const roots = await chrome.bookmarks.getTree();
    const rootChildren = roots[0]?.children ?? [];
    for (const root of rootChildren) {
      const children = await chrome.bookmarks.getChildren(root.id);
      for (const child of children) {
        if (child.url) {
          await chrome.bookmarks.remove(child.id);
        } else {
          await chrome.bookmarks.removeTree(child.id);
        }
      }
    }
  } else {
    for (const id of scopeIds) {
      const children = await chrome.bookmarks.getChildren(id);
      for (const child of children) {
        if (child.url) {
          await chrome.bookmarks.remove(child.id);
        } else {
          await chrome.bookmarks.removeTree(child.id);
        }
      }
    }
  }

  // 写入新分类（支持二级子分类）
  for (const category of result.categories) {
    await writeCategoryGroup(category, parentId);
  }

  // 写入未分类
  if (result.uncategorized.length > 0) {
    const folder = await chrome.bookmarks.create({
      parentId,
      title: '未分类',
    });
    for (const bm of result.uncategorized) {
      await chrome.bookmarks.create({
        parentId: folder.id,
        title: bm.title,
        url: bm.url,
      });
    }
  }
}

// --- 递归写入分类组（支持子分类）---

async function writeCategoryGroup(
  group: CategoryGroup,
  parentId: string,
): Promise<void> {
  const folder = await chrome.bookmarks.create({
    parentId,
    title: group.name,
  });

  // 写入该分类自身直属的书签
  for (const bm of group.bookmarks) {
    await chrome.bookmarks.create({
      parentId: folder.id,
      title: bm.title,
      url: bm.url,
    });
  }

  // 写入子分类（二级文件夹）
  if (group.subGroups && group.subGroups.length > 0) {
    for (const sub of group.subGroups) {
      await writeCategoryGroup(sub, folder.id);
    }
  }
}
