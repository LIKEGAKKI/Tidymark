import { useState } from 'react';
import { sendMessage } from '@/shared/messages';
import type { SearchResultItem } from '@/types';
import { StatusView } from '@/shared/components/StatusView';

export function SidePanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await sendMessage('SEARCH_QUERY', { query: q });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex h-screen flex-col p-4">
      <h1 className="text-lg font-bold text-indigo-700">AI 语义搜索</h1>
      <p className="mt-1 text-xs text-gray-400">用自然语言搜索你的书签</p>

      {/* 搜索框 */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：在线画流程图的工具"
          className="input-field flex-1"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          搜索
        </button>
      </div>

      {/* 结果列表 */}
      <div className="mt-4 flex-1 overflow-y-auto">
        <StatusView
          loading={loading}
          error={error}
          empty={searched && results.length === 0}
          emptyMessage="没有找到匹配的书签"
        >
          <ul className="space-y-3">
            {results.map((item) => (
              <li key={item.bookmark.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.bookmark.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {item.bookmark.url}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600">
                    {item.score}分
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{item.reason}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <span>{item.folderPath}</span>
                </div>
                <div className="mt-2 flex gap-3">
                  <a
                    href={item.bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    打开
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(item.bookmark.url ?? '')}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    复制链接
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </StatusView>
      </div>
    </div>
  );
}
