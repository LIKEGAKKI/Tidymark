import type { ExportData, BookmarkNode, AiSettings } from '@/types';
import { getFullTree, bulkRemove } from '@/bookmarks';
import {
  createSnapshot,
  getSnapshotForRestore,
  listSnapshots,
  deleteSnapshot,
} from '@/storage/snapshots';
import {
  getSettings,
  saveSettings,
  saveMetadata,
} from '@/storage/settings';
import {
  exportData,
  validateImportData,
  importConfigData,
} from '@/storage/export-import';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('bg-operations');

// --- 批量删除 ---

export async function handleBulkDelete(bookmarkIds: string[]): Promise<void> {
  // 先快照
  const tree = await getFullTree();
  try {
    await createSnapshot('bulk_delete', `${bookmarkIds.length} 个书签`, tree);
  } catch (err) {
    logger.error('Snapshot failed before bulk delete', { err });
    throw new Error('快照创建失败，已阻止删除操作。');
  }

  await bulkRemove(bookmarkIds);
  logger.info('Bulk delete completed', { count: bookmarkIds.length });
}

// --- 快照恢复 ---

export async function handleSnapshotRestore(
  snapshotId: string,
): Promise<void> {
  const data = await getSnapshotForRestore(snapshotId);
  if (!data) throw new Error('快照不存在');

  // 恢复前先快照当前状态
  const currentTree = await getFullTree();
  try {
    await createSnapshot('import_restore', '恢复前自动快照', currentTree);
  } catch {
    logger.warn('Pre-restore snapshot failed, continuing anyway');
  }

  // 恢复书签结构
  await restoreBookmarksTree(data.bookmarksTree);
  await saveMetadata(data.metadata);
  logger.info('Snapshot restored', { snapshotId });
}

// --- 导出 ---

export async function handleExport(): Promise<ExportData> {
  const tree = await getFullTree();
  return exportData(tree);
}

// --- 导入 ---

export async function handleImport(rawData: ExportData): Promise<void> {
  const validation = validateImportData(rawData);
  if (!validation.valid) throw new Error(validation.error);

  // 导入前快照
  const currentTree = await getFullTree();
  try {
    await createSnapshot('import_restore', '导入前自动快照', currentTree);
  } catch (err) {
    logger.error('Snapshot failed before import', { err });
    throw new Error('快照创建失败，已阻止导入操作。');
  }

  // 恢复配置
  await importConfigData(validation.data);

  // 恢复书签结构
  await restoreBookmarksTree(validation.data.bookmarksTree);
  logger.info('Import completed');
}

// --- 设置 ---

export async function handleGetSettings(): Promise<AiSettings> {
  return getSettings();
}

export async function handleSaveSettings(settings: AiSettings): Promise<void> {
  await saveSettings(settings);
  logger.info('Settings saved');
}

// --- 快照列表/删除 ---

export { listSnapshots as handleSnapshotList } from '@/storage/snapshots';
export { deleteSnapshot as handleSnapshotDelete } from '@/storage/snapshots';

// --- 恢复书签树（简化实现：清空后重建）---

async function restoreBookmarksTree(tree: BookmarkNode[]): Promise<void> {
  // 获取书签栏和其他书签的 ID
  const roots = await chrome.bookmarks.getTree();
  const rootChildren = roots[0]?.children ?? [];

  for (const root of rootChildren) {
    const children = await chrome.bookmarks.getChildren(root.id);
    for (const child of children) {
      if (child.children) {
        await chrome.bookmarks.removeTree(child.id);
      } else {
        await chrome.bookmarks.remove(child.id);
      }
    }
  }

  // 重建
  for (const node of tree) {
    if (node.children) {
      await rebuildNode(node, node.parentId ?? '1');
    }
  }
}

async function rebuildNode(
  node: BookmarkNode,
  parentId: string,
): Promise<void> {
  if (node.url) {
    await chrome.bookmarks.create({
      parentId,
      title: node.title,
      url: node.url,
    });
  } else if (node.children) {
    const folder = await chrome.bookmarks.create({
      parentId,
      title: node.title,
    });
    for (const child of node.children) {
      await rebuildNode(child, folder.id);
    }
  }
}
