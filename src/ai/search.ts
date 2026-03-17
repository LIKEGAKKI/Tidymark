import type { BookmarkNode, SearchResultItem } from '@/types';
import { chatCompletion, parseJsonResponse } from './client';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('ai-search');
const MAX_CANDIDATES = 50;

// --- AI 语义排序 ---

interface AiSearchResult {
  results: Array<{
    bookmarkId: string;
    score: number;
    reason: string;
  }>;
}

export async function runSearch(
  query: string,
  candidates: Array<{ bookmark: BookmarkNode; folderPath: string }>,
): Promise<SearchResultItem[]> {
  // 限制候选集大小
  const limited = candidates.slice(0, MAX_CANDIDATES);

  const candidateList = limited.map((c) => ({
    id: c.bookmark.id,
    title: c.bookmark.title,
    url: c.bookmark.url,
    folder: c.folderPath,
  }));

  const prompt = `用户想找的书签：「${query}」

候选书签列表：
${JSON.stringify(candidateList, null, 0)}

要求：
- 根据用户意图对候选书签进行语义排序
- 只返回相关的书签，不相关的不要返回
- 每个结果给出匹配理由（简短中文）
- score 范围 0-100，越高越相关
- 返回 JSON：{"results": [{"bookmarkId": "id", "score": 85, "reason": "理由"}]}`;

  logger.info('Running AI search', {
    query,
    candidateCount: limited.length,
  });

  const response = await chatCompletion([
    { role: 'system', content: '你是书签搜索助手，只返回 JSON，不要其他内容。' },
    { role: 'user', content: prompt },
  ]);

  const parsed = parseJsonResponse<AiSearchResult>(response);

  // 构建索引
  const candidateMap = new Map(limited.map((c) => [c.bookmark.id, c]));

  const results: SearchResultItem[] = parsed.results
    .map((r) => {
      const match = candidateMap.get(r.bookmarkId);
      if (!match) return null;
      return {
        bookmark: match.bookmark,
        folderPath: match.folderPath,
        reason: r.reason,
        score: r.score,
      };
    })
    .filter((r): r is SearchResultItem => r !== null)
    .sort((a, b) => b.score - a.score);

  logger.info('AI search complete', { resultCount: results.length });
  return results;
}
