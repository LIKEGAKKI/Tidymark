import type { BookmarkNode } from '@/types';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('bookmarks');

// --- 读取 ---

export async function getFullTree(): Promise<BookmarkNode[]> {
  const tree = await chrome.bookmarks.getTree();
  return tree.map(convertNode);
}

export async function getSubTree(folderId: string): Promise<BookmarkNode[]> {
  const tree = await chrome.bookmarks.getSubTree(folderId);
  return tree.map(convertNode);
}

export async function getChildren(folderId: string): Promise<BookmarkNode[]> {
  const children = await chrome.bookmarks.getChildren(folderId);
  return children.map(convertNode);
}

// --- 写入 ---

export async function createFolder(
  parentId: string,
  title: string,
): Promise<BookmarkNode> {
  const node = await chrome.bookmarks.create({ parentId, title });
  logger.info('Folder created', { id: node.id, title });
  return convertNode(node);
}

export async function createBookmark(
  parentId: string,
  title: string,
  url: string,
): Promise<BookmarkNode> {
  const node = await chrome.bookmarks.create({ parentId, title, url });
  logger.info('Bookmark created', { id: node.id, title });
  return convertNode(node);
}

export async function moveBookmark(
  id: string,
  destination: { parentId?: string; index?: number },
): Promise<void> {
  await chrome.bookmarks.move(id, destination);
  logger.info('Bookmark moved', { id, destination });
}

export async function updateBookmark(
  id: string,
  changes: { title?: string; url?: string },
): Promise<void> {
  await chrome.bookmarks.update(id, changes);
  logger.info('Bookmark updated', { id, changes });
}

export async function removeBookmark(id: string): Promise<void> {
  await chrome.bookmarks.remove(id);
  logger.info('Bookmark removed', { id });
}

export async function removeTree(id: string): Promise<void> {
  await chrome.bookmarks.removeTree(id);
  logger.info('Bookmark tree removed', { id });
}

// --- 批量删除 ---

export async function bulkRemove(ids: string[]): Promise<void> {
  for (const id of ids) {
    await chrome.bookmarks.remove(id);
  }
  logger.info('Bulk remove completed', { count: ids.length });
}

// --- 搜索 ---

export async function searchBookmarks(query: string): Promise<BookmarkNode[]> {
  const results = await chrome.bookmarks.search(query);
  return results.map(convertNode);
}

// --- 工具函数 ---

function convertNode(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    parentId: node.parentId,
    index: node.index,
    dateAdded: node.dateAdded,
    dateLastUsed: (node as unknown as Record<string, unknown>).dateLastUsed as
      | number
      | undefined,
    children: node.children?.map(convertNode),
  };
}

// --- 获取文件夹路径 ---

export async function getFolderPath(nodeId: string): Promise<string> {
  const parts: string[] = [];
  let currentId: string | undefined = nodeId;

  while (currentId && currentId !== '0') {
    const nodes: chrome.bookmarks.BookmarkTreeNode[] = await chrome.bookmarks.get(currentId);
    if (nodes.length === 0) break;
    parts.unshift(nodes[0].title || '根目录');
    currentId = nodes[0].parentId;
  }

  return parts.join(' / ');
}
