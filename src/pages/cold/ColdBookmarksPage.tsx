import { useState, useEffect } from 'react';
import { sendMessage } from '@/shared/messages';
import type { ColdBookmarkItem, ColdFilterPreset } from '@/types';
import { StatusView } from '@/shared/components/StatusView';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

const FILTERS: { value: ColdFilterPreset; label: string }[] = [
  { value: 'never_used', label: '从未再次使用' },
  { value: 'over_30_days', label: '超过 30 天未使用' },
  { value: 'over_90_days', label: '超过 90 天未使用' },
  { value: 'over_180_days', label: '超过 180 天未使用' },
];

export function ColdBookmarksPage() {
  const [items, setItems] = useState<ColdBookmarkItem[]>([]);
  const [filter, setFilter] = useState<ColdFilterPreset>('never_used');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const load = async (f: ColdFilterPreset) => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendMessage('COLD_BOOKMARKS_QUERY', { filter: f });
      setItems(result);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.bookmark.id)));
    }
  };

  const handleDelete = async () => {
    await sendMessage('BULK_DELETE', { bookmarkIds: [...selected] });
    setShowConfirm(false);
    load(filter);
  };

  const formatDays = (days: number | null) =>
    days === null ? '从未使用' : `${days} 天前`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold text-indigo-700">冷门书签</h1>
      <p className="mt-1 text-sm text-gray-400">识别长期未使用的书签并清理</p>

      {/* 筛选器 */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-gray-600">筛选：</span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 批量操作栏 */}
      {items.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={toggleAll} className="text-xs text-indigo-600 hover:underline">
            {selected.size === items.length ? '取消全选' : '全选'}
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
            >
              删除选中 ({selected.size})
            </button>
          )}
          <span className="text-xs text-gray-400">共 {items.length} 条</span>
        </div>
      )}

      {/* 列表 */}
      <div className="mt-4">
        <StatusView loading={loading} error={error} empty={items.length === 0} emptyMessage="没有符合条件的冷门书签">
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.bookmark.id}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.bookmark.id)}
                  onChange={() => toggleSelect(item.bookmark.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.bookmark.title}</p>
                  <p className="truncate text-xs text-gray-400">{item.bookmark.url}</p>
                  <p className="text-xs text-gray-300">{item.folderPath}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDays(item.daysSinceLastUsed)}
                </span>
                <a
                  href={item.bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-indigo-600 hover:underline"
                >
                  打开
                </a>
              </li>
            ))}
          </ul>
        </StatusView>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="确认批量删除"
        description={`即将删除 ${selected.size} 个书签，操作前会自动创建快照。`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
