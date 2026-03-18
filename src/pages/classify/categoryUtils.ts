import type { CategoryGroup, BookmarkNode } from '@/types';

export const UNCATEGORIZED_ID = '__uncategorized__';

export function findGroupById(
  categories: CategoryGroup[],
  id: string,
): CategoryGroup | undefined {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    for (const sub of cat.subGroups ?? []) {
      if (sub.id === id) return sub;
    }
  }
  return undefined;
}

export function removeBookmarkFromGroup(
  categories: CategoryGroup[],
  uncategorized: BookmarkNode[],
  groupId: string,
  bookmarkId: string,
): { bookmark: BookmarkNode | undefined; categories: CategoryGroup[]; uncategorized: BookmarkNode[] } {
  if (groupId === UNCATEGORIZED_ID) {
    const bm = uncategorized.find((b) => b.id === bookmarkId);
    return { bookmark: bm, categories, uncategorized: uncategorized.filter((b) => b.id !== bookmarkId) };
  }

  let bookmark: BookmarkNode | undefined;
  const nextCats = categories.map((cat) => {
    if (cat.id === groupId) {
      bookmark = cat.bookmarks.find((b) => b.id === bookmarkId);
      return { ...cat, bookmarks: cat.bookmarks.filter((b) => b.id !== bookmarkId) };
    }
    const sub = (cat.subGroups ?? []).find((s) => s.id === groupId);
    if (sub) {
      bookmark = sub.bookmarks.find((b) => b.id === bookmarkId);
      const nextSubs = (cat.subGroups ?? []).map((s) =>
        s.id === groupId ? { ...s, bookmarks: s.bookmarks.filter((b) => b.id !== bookmarkId) } : s,
      );
      return { ...cat, subGroups: nextSubs };
    }
    return cat;
  });

  return { bookmark, categories: nextCats, uncategorized };
}

export function addBookmarkToGroup(
  categories: CategoryGroup[],
  uncategorized: BookmarkNode[],
  groupId: string,
  bookmark: BookmarkNode,
): { categories: CategoryGroup[]; uncategorized: BookmarkNode[] } {
  if (groupId === UNCATEGORIZED_ID) {
    return { categories, uncategorized: [...uncategorized, bookmark] };
  }
  const nextCats = categories.map((cat) => {
    if (cat.id === groupId) return { ...cat, bookmarks: [...cat.bookmarks, bookmark] };
    const sub = (cat.subGroups ?? []).find((s) => s.id === groupId);
    if (sub) {
      const nextSubs = (cat.subGroups ?? []).map((s) =>
        s.id === groupId ? { ...s, bookmarks: [...s.bookmarks, bookmark] } : s,
      );
      return { ...cat, subGroups: nextSubs };
    }
    return cat;
  });
  return { categories: nextCats, uncategorized };
}

export function pruneEmpty(categories: CategoryGroup[]): CategoryGroup[] {
  return categories
    .map((cat) => ({
      ...cat,
      subGroups: (cat.subGroups ?? []).filter((s) => s.bookmarks.length > 0),
    }))
    .filter((cat) => cat.bookmarks.length > 0 || (cat.subGroups ?? []).length > 0);
}

export function validateName(
  name: string,
  siblings: CategoryGroup[],
  currentId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '分类名称不能为空';
  const duplicate = siblings.find((s) => s.name === trimmed && s.id !== currentId);
  if (duplicate) return '同层级已存在同名分类';
  return null;
}
