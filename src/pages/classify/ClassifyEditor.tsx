import { useState } from 'react';
import type { ClassifyResult, CategoryGroup, BookmarkNode } from '@/types';

interface ClassifyEditorProps {
  result: ClassifyResult;
  onChange: (result: ClassifyResult) => void;
}

type DragSource = { bookmarkId: string; fromPath: string };

/** 用 "catName" 或 "catName/subName" 定位分类 */
function findBookmarkAndRemove(
  categories: CategoryGroup[],
  uncategorized: BookmarkNode[],
  path: string,
  bookmarkId: string,
): { bookmark: BookmarkNode | undefined; categories: CategoryGroup[]; uncategorized: BookmarkNode[] } {
  if (path === '__uncategorized__') {
    const bm = uncategorized.find((b) => b.id === bookmarkId);
    return { bookmark: bm, categories, uncategorized: uncategorized.filter((b) => b.id !== bookmarkId) };
  }

  const [catName, subName] = path.split('/');
  let bookmark: BookmarkNode | undefined;

  const nextCats = categories.map((cat) => {
    if (cat.name !== catName) return cat;
    if (subName) {
      const nextSubs = (cat.subGroups ?? []).map((sub) => {
        if (sub.name !== subName) return sub;
        bookmark = sub.bookmarks.find((b) => b.id === bookmarkId);
        return { ...sub, bookmarks: sub.bookmarks.filter((b) => b.id !== bookmarkId) };
      });
      return { ...cat, subGroups: nextSubs };
    }
    bookmark = cat.bookmarks.find((b) => b.id === bookmarkId);
    return { ...cat, bookmarks: cat.bookmarks.filter((b) => b.id !== bookmarkId) };
  });

  return { bookmark, categories: nextCats, uncategorized };
}

function addBookmarkToPath(
  categories: CategoryGroup[],
  uncategorized: BookmarkNode[],
  path: string,
  bookmark: BookmarkNode,
): { categories: CategoryGroup[]; uncategorized: BookmarkNode[] } {
  if (path === '__uncategorized__') {
    return { categories, uncategorized: [...uncategorized, bookmark] };
  }
  const [catName, subName] = path.split('/');
  const nextCats = categories.map((cat) => {
    if (cat.name !== catName) return cat;
    if (subName) {
      const nextSubs = (cat.subGroups ?? []).map((sub) =>
        sub.name === subName ? { ...sub, bookmarks: [...sub.bookmarks, bookmark] } : sub,
      );
      return { ...cat, subGroups: nextSubs };
    }
    return { ...cat, bookmarks: [...cat.bookmarks, bookmark] };
  });
  return { categories: nextCats, uncategorized };
}

/** 清理空分类 */
function pruneEmpty(categories: CategoryGroup[]): CategoryGroup[] {
  return categories
    .map((cat) => ({
      ...cat,
      subGroups: (cat.subGroups ?? []).filter((s) => s.bookmarks.length > 0),
    }))
    .filter((cat) => cat.bookmarks.length > 0 || (cat.subGroups ?? []).length > 0);
}

export function ClassifyEditor({ result, onChange }: ClassifyEditorProps) {
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragSource | null>(null);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const handleDrop = (targetPath: string) => {
    if (!dragItem || dragItem.fromPath === targetPath) return;
    const { bookmark, categories, uncategorized } = findBookmarkAndRemove(
      result.categories, result.uncategorized, dragItem.fromPath, dragItem.bookmarkId,
    );
    if (!bookmark) return;
    const added = addBookmarkToPath(categories, uncategorized, targetPath, bookmark);
    onChange({ categories: pruneEmpty(added.categories), uncategorized: added.uncategorized });
    setDragItem(null);
  };

  const rename = (path: string, newName: string) => {
    const [catName, subName] = path.split('/');
    const next = result.categories.map((cat) => {
      if (cat.name !== catName) return cat;
      if (subName) {
        const subs = (cat.subGroups ?? []).map((s) => (s.name === subName ? { ...s, name: newName } : s));
        return { ...cat, subGroups: subs };
      }
      return { ...cat, name: newName };
    });
    onChange({ ...result, categories: next });
    setEditingPath(null);
  };

  const promoteSubGroup = (catName: string, subName: string) => {
    let promoted: CategoryGroup | undefined;
    const next = result.categories.map((cat) => {
      if (cat.name !== catName) return cat;
      promoted = (cat.subGroups ?? []).find((s) => s.name === subName);
      return { ...cat, subGroups: (cat.subGroups ?? []).filter((s) => s.name !== subName) };
    });
    if (promoted) next.push({ ...promoted, subGroups: undefined });
    onChange({ ...result, categories: pruneEmpty(next) });
  };

  const addSubGroup = (catName: string) => {
    if (!newSubName.trim()) return;
    const next = result.categories.map((cat) => {
      if (cat.name !== catName) return cat;
      const subs = [...(cat.subGroups ?? []), { name: newSubName.trim(), bookmarks: [] }];
      return { ...cat, subGroups: subs };
    });
    onChange({ ...result, categories: next });
    setAddingSubFor(null);
    setNewSubName('');
  };

  return (
    <div className="space-y-4">
      {result.categories.map((cat) => (
        <div key={cat.name}>
          <CategoryCard
            category={cat}
            path={cat.name}
            editingPath={editingPath}
            onStartEdit={setEditingPath}
            onRename={rename}
            onCancelEdit={() => setEditingPath(null)}
            onDragStart={(bid, path) => setDragItem({ bookmarkId: bid, fromPath: path })}
            onDrop={handleDrop}
          />
          {/* 子分类 */}
          {(cat.subGroups ?? []).map((sub) => (
            <div key={sub.name} className="ml-6 mt-1 border-l-2 border-indigo-100 pl-3">
              <CategoryCard
                category={sub}
                path={`${cat.name}/${sub.name}`}
                editingPath={editingPath}
                onStartEdit={setEditingPath}
                onRename={rename}
                onCancelEdit={() => setEditingPath(null)}
                onDragStart={(bid, path) => setDragItem({ bookmarkId: bid, fromPath: path })}
                onDrop={handleDrop}
                compact
                extraActions={
                  <button
                    onClick={() => promoteSubGroup(cat.name, sub.name)}
                    className="text-xs text-gray-400 hover:text-indigo-600"
                  >提升为一级分类</button>
                }
              />
            </div>
          ))}
          {/* 新建子分类 */}
          <div className="ml-6 mt-1">
            {addingSubFor === cat.name ? (
              <div className="flex items-center gap-2 py-1">
                <input
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="子分类名称"
                  className="input-field text-xs w-36"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addSubGroup(cat.name)}
                />
                <button onClick={() => addSubGroup(cat.name)} className="text-xs text-indigo-600">确定</button>
                <button onClick={() => { setAddingSubFor(null); setNewSubName(''); }} className="text-xs text-gray-400">取消</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSubFor(cat.name)}
                className="text-xs text-gray-400 hover:text-indigo-600"
              >+ 新建子分类</button>
            )}
          </div>
        </div>
      ))}

      {result.uncategorized.length > 0 && (
        <CategoryCard
          category={{ name: '未分类 / 待确认', bookmarks: result.uncategorized }}
          path="__uncategorized__"
          editingPath={null}
          onStartEdit={() => {}}
          onRename={() => {}}
          onCancelEdit={() => {}}
          onDragStart={(bid) => setDragItem({ bookmarkId: bid, fromPath: '__uncategorized__' })}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}

function CategoryCard({
  category,
  path,
  editingPath,
  onStartEdit,
  onRename,
  onCancelEdit,
  onDragStart,
  onDrop,
  compact,
  extraActions,
}: {
  category: CategoryGroup;
  path: string;
  editingPath: string | null;
  onStartEdit: (path: string) => void;
  onRename: (path: string, name: string) => void;
  onCancelEdit: () => void;
  onDragStart: (bookmarkId: string, path: string) => void;
  onDrop: (targetPath: string) => void;
  compact?: boolean;
  extraActions?: React.ReactNode;
}) {
  const [nameInput, setNameInput] = useState(category.name);
  const editing = editingPath === path;
  const isUncategorized = path === '__uncategorized__';

  return (
    <div
      className={`rounded-lg border ${compact ? 'p-3 text-xs' : 'p-4'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(path); }}
    >
      <div className="flex items-center gap-2">
        {editing ? (
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="input-field text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onRename(path, nameInput)}
            />
            <button onClick={() => onRename(path, nameInput)} className="text-xs text-indigo-600">确定</button>
            <button onClick={onCancelEdit} className="text-xs text-gray-400">取消</button>
          </div>
        ) : (
          <>
            <h3 className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{category.name}</h3>
            <span className="text-xs text-gray-400">({category.bookmarks.length})</span>
            {!isUncategorized && (
              <button onClick={() => { setNameInput(category.name); onStartEdit(path); }} className="text-xs text-gray-400 hover:text-indigo-600">
                重命名
              </button>
            )}
            {extraActions}
          </>
        )}
      </div>

      {category.bookmarks.length > 0 && (
        <ul className={`mt-2 space-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {category.bookmarks.map((bm) => (
            <li
              key={bm.id}
              draggable
              onDragStart={() => onDragStart(bm.id, path)}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
            >
              <span className="text-gray-300">⠿</span>
              <span className="truncate flex-1">{bm.title}</span>
              <span className="truncate text-xs text-gray-300 max-w-48">{bm.url}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
