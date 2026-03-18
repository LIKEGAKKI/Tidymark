import { useState } from 'react';
import type { ClassifyResult, CategoryGroup } from '@/types';
import { CategoryCard } from './CategoryCard';
import { MergeMenu } from './MergeMenu';
import {
  UNCATEGORIZED_ID,
  findGroupById,
  removeBookmarkFromGroup,
  addBookmarkToGroup,
  pruneEmpty,
  validateName,
} from './categoryUtils';

interface ClassifyEditorProps {
  result: ClassifyResult;
  onChange: (result: ClassifyResult) => void;
}

type DragSource = { bookmarkId: string; fromGroupId: string };

export function ClassifyEditor({ result, onChange }: ClassifyEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragSource | null>(null);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mergingId, setMergingId] = useState<string | null>(null);

  const handleDrop = (targetGroupId: string) => {
    if (!dragItem || dragItem.fromGroupId === targetGroupId) return;
    const { bookmark, categories, uncategorized } = removeBookmarkFromGroup(
      result.categories, result.uncategorized, dragItem.fromGroupId, dragItem.bookmarkId,
    );
    if (!bookmark) return;
    const added = addBookmarkToGroup(categories, uncategorized, targetGroupId, bookmark);
    onChange({ categories: pruneEmpty(added.categories), uncategorized: added.uncategorized });
    setDragItem(null);
  };

  const rename = (groupId: string, newName: string) => {
    const group = findGroupById(result.categories, groupId);
    if (!group) return;

    const parent = result.categories.find((c) =>
      (c.subGroups ?? []).some((s) => s.id === groupId),
    );
    const siblings = parent ? (parent.subGroups ?? []) : result.categories;
    const error = validateName(newName, siblings, groupId);
    if (error) {
      setValidationError(error);
      return;
    }

    const next = result.categories.map((cat) => {
      if (cat.id === groupId) return { ...cat, name: newName.trim() };
      const hasSub = (cat.subGroups ?? []).some((s) => s.id === groupId);
      if (hasSub) {
        const subs = (cat.subGroups ?? []).map((s) =>
          s.id === groupId ? { ...s, name: newName.trim() } : s,
        );
        return { ...cat, subGroups: subs };
      }
      return cat;
    });
    onChange({ ...result, categories: next });
    setEditingId(null);
    setValidationError(null);
  };

  const promoteSubGroup = (parentId: string, subId: string) => {
    let promoted: CategoryGroup | undefined;
    const next = result.categories.map((cat) => {
      if (cat.id !== parentId) return cat;
      promoted = (cat.subGroups ?? []).find((s) => s.id === subId);
      return { ...cat, subGroups: (cat.subGroups ?? []).filter((s) => s.id !== subId) };
    });
    if (promoted) next.push({ ...promoted, subGroups: undefined });
    onChange({ ...result, categories: pruneEmpty(next) });
  };

  const addSubGroup = (parentId: string) => {
    const parent = result.categories.find((c) => c.id === parentId);
    if (!parent) return;

    const error = validateName(newSubName, parent.subGroups ?? []);
    if (error) {
      setValidationError(error);
      return;
    }

    const newSub: CategoryGroup = {
      id: crypto.randomUUID(),
      name: newSubName.trim(),
      bookmarks: [],
    };
    const next = result.categories.map((cat) => {
      if (cat.id !== parentId) return cat;
      return { ...cat, subGroups: [...(cat.subGroups ?? []), newSub] };
    });
    onChange({ ...result, categories: next });
    setAddingSubFor(null);
    setNewSubName('');
    setValidationError(null);
  };

  const mergeGroups = (sourceId: string, targetId: string) => {
    const source = findGroupById(result.categories, sourceId);
    const target = findGroupById(result.categories, targetId);
    if (!source || !target) return;

    const isSourceTopLevel = result.categories.some((c) => c.id === sourceId);
    const isTargetTopLevel = result.categories.some((c) => c.id === targetId);

    if (isSourceTopLevel && isTargetTopLevel) {
      const next = result.categories.map((cat) => {
        if (cat.id === targetId) {
          return {
            ...cat,
            bookmarks: [...cat.bookmarks, ...source.bookmarks],
            subGroups: [...(cat.subGroups ?? []), ...(source.subGroups ?? [])],
          };
        }
        return cat;
      }).filter((cat) => cat.id !== sourceId);
      onChange({ ...result, categories: pruneEmpty(next) });
    } else {
      const next = result.categories.map((cat) => {
        const subs = cat.subGroups ?? [];
        const hasSource = subs.some((s) => s.id === sourceId);
        const hasTarget = subs.some((s) => s.id === targetId);
        if (!hasSource || !hasTarget) return cat;
        const nextSubs = subs
          .map((s) => {
            if (s.id === targetId) {
              return { ...s, bookmarks: [...s.bookmarks, ...source.bookmarks] };
            }
            return s;
          })
          .filter((s) => s.id !== sourceId);
        return { ...cat, subGroups: nextSubs };
      });
      onChange({ ...result, categories: pruneEmpty(next) });
    }
    setMergingId(null);
  };

  const startEdit = (id: string) => {
    setEditingId(id);
    setValidationError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setValidationError(null);
  };

  return (
    <div className="space-y-4">
      {result.categories.map((cat) => (
        <div key={cat.id}>
          <CategoryCard
            category={cat}
            groupId={cat.id}
            editingId={editingId}
            validationError={editingId === cat.id ? validationError : null}
            onStartEdit={startEdit}
            onRename={rename}
            onCancelEdit={cancelEdit}
            onDragStart={(bid, gid) => setDragItem({ bookmarkId: bid, fromGroupId: gid })}
            onDrop={handleDrop}
            extraActions={
              <button
                onClick={() => setMergingId(mergingId === cat.id ? null : cat.id)}
                className="text-xs text-gray-400 hover:text-indigo-600"
              >合并到...</button>
            }
          />
          {mergingId === cat.id && (
            <MergeMenu
              sourceId={cat.id}
              candidates={result.categories}
              onMerge={mergeGroups}
              onCancel={() => setMergingId(null)}
            />
          )}

          {(cat.subGroups ?? []).map((sub) => (
            <div key={sub.id} className="ml-6 mt-1 border-l-2 border-indigo-100 pl-3">
              <CategoryCard
                category={sub}
                groupId={sub.id}
                editingId={editingId}
                validationError={editingId === sub.id ? validationError : null}
                onStartEdit={startEdit}
                onRename={rename}
                onCancelEdit={cancelEdit}
                onDragStart={(bid, gid) => setDragItem({ bookmarkId: bid, fromGroupId: gid })}
                onDrop={handleDrop}
                compact
                extraActions={
                  <>
                    <button
                      onClick={() => promoteSubGroup(cat.id, sub.id)}
                      className="text-xs text-gray-400 hover:text-indigo-600"
                    >提升为一级</button>
                    <button
                      onClick={() => setMergingId(mergingId === sub.id ? null : sub.id)}
                      className="text-xs text-gray-400 hover:text-indigo-600"
                    >合并到...</button>
                  </>
                }
              />
              {mergingId === sub.id && (
                <MergeMenu
                  sourceId={sub.id}
                  candidates={cat.subGroups ?? []}
                  onMerge={mergeGroups}
                  onCancel={() => setMergingId(null)}
                />
              )}
            </div>
          ))}

          <div className="ml-6 mt-1">
            {addingSubFor === cat.id ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 py-1">
                  <input
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="子分类名称"
                    className="input-field text-xs w-36"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && addSubGroup(cat.id)}
                  />
                  <button onClick={() => addSubGroup(cat.id)} className="text-xs text-indigo-600">确定</button>
                  <button onClick={() => { setAddingSubFor(null); setNewSubName(''); setValidationError(null); }} className="text-xs text-gray-400">取消</button>
                </div>
                {validationError && (
                  <span className="text-xs text-red-500">{validationError}</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAddingSubFor(cat.id)}
                className="text-xs text-gray-400 hover:text-indigo-600"
              >+ 新建子分类</button>
            )}
          </div>
        </div>
      ))}

      {result.uncategorized.length > 0 && (
        <CategoryCard
          category={{ id: UNCATEGORIZED_ID, name: '未分类 / 待确认', bookmarks: result.uncategorized }}
          groupId={UNCATEGORIZED_ID}
          editingId={null}
          validationError={null}
          onStartEdit={() => {}}
          onRename={() => {}}
          onCancelEdit={() => {}}
          onDragStart={(bid) => setDragItem({ bookmarkId: bid, fromGroupId: UNCATEGORIZED_ID })}
          onDrop={handleDrop}
          isUncategorized
        />
      )}
    </div>
  );
}
