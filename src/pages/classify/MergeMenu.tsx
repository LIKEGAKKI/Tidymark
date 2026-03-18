import type { CategoryGroup } from '@/types';

interface MergeMenuProps {
  sourceId: string;
  candidates: CategoryGroup[];
  onMerge: (sourceId: string, targetId: string) => void;
  onCancel: () => void;
}

export function MergeMenu({ sourceId, candidates, onMerge, onCancel }: MergeMenuProps) {
  const targets = candidates.filter((c) => c.id !== sourceId);

  if (targets.length === 0) {
    return (
      <div className="mt-1 rounded border bg-white p-2 shadow-sm text-xs text-gray-400">
        没有可合并的目标分类
        <button onClick={onCancel} className="ml-2 text-gray-400 hover:text-gray-600">关闭</button>
      </div>
    );
  }

  return (
    <div className="mt-1 rounded border bg-white p-2 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">合并到：</p>
      <ul className="space-y-1">
        {targets.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => onMerge(sourceId, t.id)}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600"
            >
              {t.name}
              <span className="text-gray-300 ml-1">({t.bookmarks.length})</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onCancel} className="mt-1 text-xs text-gray-400 hover:text-gray-600">取消</button>
    </div>
  );
}
