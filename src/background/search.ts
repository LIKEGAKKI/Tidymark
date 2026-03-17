import type { SearchResultItem } from '@/types';
import { getFullTree, getFolderPath } from '@/bookmarks';
import { ensureAiConfigured } from '@/ai/client';
import { localFilter } from '@/ai/filter';
import { runSearch } from '@/ai/search';
import { createLogger } from '@/shared/utils/logger';
import type { BookmarkNode } from '@/types';

const logger = createLogger('bg-search');

export async function handleSearchQuery(
  query: string,
): Promise<SearchResultItem[]> {
  // 校验 AI 配置
  const check = await ensureAiConfigured();
  if (!check.ready) throw new Error(check.error.message);

  // 读取全部书签
  const tree = await getFullTree();
  const allBookmarks = flattenUrlNodes(tree);

  // 构建候选集（含文件夹路径）
  const candidates = await Promise.all(
    allBookmarks.map(async (bm) => ({
      bookmark: bm,
      folderPath: bm.parentId ? await getFolderPath(bm.parentId) : '',
    })),
  );

  // 本地粗筛
  const filtered = localFilter(query, candidates);
  logger.info('Local filter done', {
    total: candidates.length,
    filtered: filtered.length,
  });

  if (filtered.length === 0) {
    return [];
  }

  // AI 语义排序
  const results = await runSearch(query, filtered);
  logger.info('Search complete', { resultCount: results.length });
  return results;
}

// --- 提取所有 URL 节点 ---

function flattenUrlNodes(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  for (const node of nodes) {
    if (node.url) result.push(node);
    if (node.children) result.push(...flattenUrlNodes(node.children));
  }
  return result;
}
