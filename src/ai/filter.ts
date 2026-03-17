import type { BookmarkNode } from '@/types';

// --- 本地粗筛：基于标题、URL、文件夹名做关键词匹配 ---

interface FilterCandidate {
  bookmark: BookmarkNode;
  folderPath: string;
}

export function localFilter(
  query: string,
  bookmarks: FilterCandidate[],
): FilterCandidate[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return bookmarks;

  return bookmarks
    .map((item) => {
      const score = calculateMatchScore(item, keywords);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// --- 提取关键词 ---

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,，、;；.。!！?？]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

// --- 计算匹配分数 ---

function calculateMatchScore(
  candidate: FilterCandidate,
  keywords: string[],
): number {
  const { bookmark, folderPath } = candidate;
  const title = (bookmark.title ?? '').toLowerCase();
  const url = (bookmark.url ?? '').toLowerCase();
  const folder = folderPath.toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    if (title.includes(kw)) score += 3;
    if (url.includes(kw)) score += 2;
    if (folder.includes(kw)) score += 1;
  }
  return score;
}
