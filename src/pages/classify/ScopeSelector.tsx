import { useState, useEffect } from 'react';
import { sendMessage } from '@/shared/messages';
import type { BookmarkNode } from '@/types';

interface ScopeSelectorProps {
  onStart: (folderIds: string[], scopeLabel: string) => void;
}

export function ScopeSelector({ onStart }: ScopeSelectorProps) {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sendMessage('GET_BOOKMARK_TREE', {})
      .then((data) => {
        // 取根节点的 children（书签栏、其他书签等）
        const roots = data[0]?.children ?? data;
        setTree(roots);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleFolder = (id: string, node: BookmarkNode) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // 取消选中：移除自身和所有子文件夹
        removeWithDescendants(next, node);
      } else {
        // 选中：添加自身和所有子文件夹
        addWithDescendants(next, node);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold">选择分类范围</h2>
      <p className="mt-1 text-xs text-gray-400">
        选择要进行 AI 分类的文件夹，不选则对全部书签分类
      </p>

      <div className="mt-4 rounded-md border p-3">
        <button
          onClick={selectAll}
          className={`mb-2 rounded-full px-3 py-1 text-xs ${
            selected.size === 0
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部书签
        </button>
        <FolderTree nodes={tree} selected={selected} onToggle={toggleFolder} depth={0} />
      </div>

      <div className="mt-3 rounded-md bg-indigo-50 p-3 text-xs text-indigo-700">
        当前范围：{selected.size === 0 ? '全部书签' : `已选择 ${selected.size} 个文件夹`}
      </div>

      <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-700">
        AI 分类将重组所选范围内的书签结构，操作前会自动创建快照。
      </div>

      <button
        onClick={() => {
          const ids = getTopLevelSelected(tree, selected);
          const label = buildScopeLabel(ids, tree);
          onStart(ids, label);
        }}
        className="mt-4 rounded-md bg-indigo-600 px-6 py-2 text-sm text-white hover:bg-indigo-700"
      >
        开始生成
      </button>
    </div>
  );
}

function FolderTree({
  nodes,
  selected,
  onToggle,
  depth,
}: {
  nodes: BookmarkNode[];
  selected: Set<string>;
  onToggle: (id: string, node: BookmarkNode) => void;
  depth: number;
}) {
  const folders = nodes.filter((n) => n.children);

  return (
    <ul style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      {folders.map((folder) => (
        <li key={folder.id} className="py-0.5">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1">
            <input
              type="checkbox"
              checked={selected.has(folder.id)}
              onChange={() => onToggle(folder.id, folder)}
            />
            <span className="text-sm">{folder.title || '(无标题)'}</span>
            <span className="text-xs text-gray-300">
              {countUrls(folder)} 个书签
            </span>
          </label>
          {folder.children && (
            <FolderTree
              nodes={folder.children}
              selected={selected}
              onToggle={onToggle}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function addWithDescendants(set: Set<string>, node: BookmarkNode) {
  if (node.children) {
    set.add(node.id);
    for (const child of node.children) {
      if (child.children) addWithDescendants(set, child);
    }
  }
}

function removeWithDescendants(set: Set<string>, node: BookmarkNode) {
  set.delete(node.id);
  if (node.children) {
    for (const child of node.children) {
      if (child.children) removeWithDescendants(set, child);
    }
  }
}

function countUrls(node: BookmarkNode): number {
  let count = 0;
  if (node.url) count++;
  if (node.children) {
    for (const child of node.children) count += countUrls(child);
  }
  return count;
}

/** 只提取最顶层被选中的文件夹 ID（排除已被父级包含的子文件夹） */
function getTopLevelSelected(
  tree: BookmarkNode[],
  selected: Set<string>,
): string[] {
  const result: string[] = [];
  function walk(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (!node.children) continue;
      if (selected.has(node.id)) {
        result.push(node.id);
      } else if (node.children) {
        walk(node.children);
      }
    }
  }
  walk(tree);
  return result;
}

function buildScopeLabel(ids: string[], tree: BookmarkNode[]): string {
  if (ids.length === 0) return '全部书签';
  if (ids.length > 1) return `已选择 ${ids.length} 个文件夹`;
  const name = findFolderName(ids[0], tree);
  return name ? `文件夹「${name}」` : '已选择 1 个文件夹';
}

function findFolderName(id: string, nodes: BookmarkNode[]): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.title || '(无标题)';
    if (node.children) {
      const found = findFolderName(id, node.children);
      if (found) return found;
    }
  }
  return undefined;
}
