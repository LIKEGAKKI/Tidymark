import { useState } from 'react';
import type { CategoryGroup, BookmarkNode } from '@/types';

export interface CategoryCardProps {
  category: CategoryGroup;
  groupId: string;
  editingId: string | null;
  validationError: string | null;
  onStartEdit: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCancelEdit: () => void;
  onDragStart: (bookmarkId: string, fromGroupId: string) => void;
  onDrop: (targetGroupId: string) => void;
  compact?: boolean;
  extraActions?: React.ReactNode;
  isUncategorized?: boolean;
}

export function CategoryCard({
  category,
  groupId,
  editingId,
  validationError,
  onStartEdit,
  onRename,
  onCancelEdit,
  onDragStart,
  onDrop,
  compact,
  extraActions,
  isUncategorized,
}: CategoryCardProps) {
  const [nameInput, setNameInput] = useState(category.name);
  const editing = editingId === groupId;

  return (
    <div
      className={`rounded-lg border ${compact ? 'p-3 text-xs' : 'p-4'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(groupId); }}
    >
      <div className="flex items-center gap-2">
        {editing ? (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="input-field text-sm w-48"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && onRename(groupId, nameInput)}
              />
              <button onClick={() => onRename(groupId, nameInput)} className="text-xs text-indigo-600">确定</button>
              <button onClick={onCancelEdit} className="text-xs text-gray-400">取消</button>
            </div>
            {validationError && (
              <span className="text-xs text-red-500">{validationError}</span>
            )}
          </div>
        ) : (
          <>
            <h3 className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{category.name}</h3>
            <span className="text-xs text-gray-400">({category.bookmarks.length})</span>
            {!isUncategorized && (
              <button
                onClick={() => { setNameInput(category.name); onStartEdit(groupId); }}
                className="text-xs text-gray-400 hover:text-indigo-600"
              >
                重命名
              </button>
            )}
            {extraActions}
          </>
        )}
      </div>

      {category.bookmarks.length > 0 && (
        <BookmarkList
          bookmarks={category.bookmarks}
          groupId={groupId}
          compact={compact}
          onDragStart={onDragStart}
        />
      )}
    </div>
  );
}

function BookmarkList({
  bookmarks,
  groupId,
  compact,
  onDragStart,
}: {
  bookmarks: BookmarkNode[];
  groupId: string;
  compact?: boolean;
  onDragStart: (bookmarkId: string, fromGroupId: string) => void;
}) {
  return (
    <ul className={`mt-2 space-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {bookmarks.map((bm) => (
        <li
          key={bm.id}
          draggable
          onDragStart={() => onDragStart(bm.id, groupId)}
          className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
        >
          <span className="text-gray-300">⠿</span>
          <span className="truncate flex-1">{bm.title}</span>
          <span className="truncate text-xs text-gray-300 max-w-48">{bm.url}</span>
        </li>
      ))}
    </ul>
  );
}
