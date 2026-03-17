import type { Snapshot, SnapshotType, BookmarkNode, AppMetadata } from '@/types';
import { KEYS } from './settings';
import { getMetadata } from './settings';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('snapshots');
const MAX_SNAPSHOTS = 10;

// --- 读取全部快照 ---

export async function listSnapshots(): Promise<Snapshot[]> {
  const result = await chrome.storage.local.get(KEYS.snapshots);
  return (result[KEYS.snapshots] as Snapshot[]) ?? [];
}

// --- 创建快照 ---

export async function createSnapshot(
  type: SnapshotType,
  scope: string,
  bookmarksTree: BookmarkNode[],
): Promise<Snapshot> {
  const metadata = await getMetadata();
  const snapshot: Snapshot = {
    id: generateId(),
    createdAt: Date.now(),
    type,
    scope,
    bookmarksTree,
    metadata,
  };

  const snapshots = await listSnapshots();
  snapshots.push(snapshot);

  // 超过上限时淘汰最旧的
  while (snapshots.length > MAX_SNAPSHOTS) {
    const removed = snapshots.shift();
    if (removed) {
      logger.info('Auto-removed oldest snapshot', { id: removed.id });
    }
  }

  await chrome.storage.local.set({ [KEYS.snapshots]: snapshots });
  logger.info('Snapshot created', { id: snapshot.id, type });
  return snapshot;
}

// --- 获取单个快照 ---

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const snapshots = await listSnapshots();
  return snapshots.find((s) => s.id === id) ?? null;
}

// --- 删除快照 ---

export async function deleteSnapshot(id: string): Promise<void> {
  const snapshots = await listSnapshots();
  const filtered = snapshots.filter((s) => s.id !== id);
  await chrome.storage.local.set({ [KEYS.snapshots]: filtered });
  logger.info('Snapshot deleted', { id });
}

// --- 恢复快照（仅返回数据，实际写入由调用方完成）---

export async function getSnapshotForRestore(
  id: string,
): Promise<{ bookmarksTree: BookmarkNode[]; metadata: AppMetadata } | null> {
  const snapshot = await getSnapshot(id);
  if (!snapshot) return null;
  return {
    bookmarksTree: snapshot.bookmarksTree,
    metadata: snapshot.metadata,
  };
}

// --- 工具函数 ---

function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
