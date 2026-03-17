import type { ColdBookmarkItem, ColdFilterPreset, BookmarkNode } from '@/types';
import { getFullTree, getFolderPath } from '@/bookmarks';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('bg-cold');
const MS_PER_DAY = 86_400_000;

export async function handleColdBookmarksQuery(
  filter: ColdFilterPreset,
): Promise<ColdBookmarkItem[]> {
  const tree = await getFullTree();
  const allUrls = flattenUrlNodes(tree);
  const now = Date.now();

  // 计算每个书签的冷门信息
  const items: ColdBookmarkItem[] = await Promise.all(
    allUrls.map(async (bm) => {
      const daysSinceLastUsed = bm.dateLastUsed
        ? Math.floor((now - bm.dateLastUsed) / MS_PER_DAY)
        : null;
      const folderPath = bm.parentId
        ? await getFolderPath(bm.parentId)
        : '';
      return { bookmark: bm, folderPath, daysSinceLastUsed };
    }),
  );

  // 应用筛选
  const filtered = applyFilter(items, filter);

  // 排序：null（从未使用）优先，然后按 daysSinceLastUsed 降序
  filtered.sort((a, b) => {
    if (a.daysSinceLastUsed === null && b.daysSinceLastUsed === null) return 0;
    if (a.daysSinceLastUsed === null) return -1;
    if (b.daysSinceLastUsed === null) return 1;
    return b.daysSinceLastUsed - a.daysSinceLastUsed;
  });

  logger.info('Cold bookmarks query', {
    filter,
    total: allUrls.length,
    result: filtered.length,
  });

  return filtered;
}

function applyFilter(
  items: ColdBookmarkItem[],
  filter: ColdFilterPreset,
): ColdBookmarkItem[] {
  switch (filter) {
    case 'never_used':
      return items.filter((i) => i.daysSinceLastUsed === null);
    case 'over_30_days':
      return items.filter(
        (i) => i.daysSinceLastUsed === null || i.daysSinceLastUsed > 30,
      );
    case 'over_90_days':
      return items.filter(
        (i) => i.daysSinceLastUsed === null || i.daysSinceLastUsed > 90,
      );
    case 'over_180_days':
      return items.filter(
        (i) => i.daysSinceLastUsed === null || i.daysSinceLastUsed > 180,
      );
  }
}

function flattenUrlNodes(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  for (const node of nodes) {
    if (node.url) result.push(node);
    if (node.children) result.push(...flattenUrlNodes(node.children));
  }
  return result;
}
