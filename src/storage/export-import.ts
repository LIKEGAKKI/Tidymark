import type { ExportData, BookmarkNode } from '@/types';
import { getSettings, getMetadata, saveSettings, saveMetadata } from './settings';
import { listSnapshots } from './snapshots';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('export-import');
const CURRENT_SCHEMA_VERSION = 1;

// --- 导出 ---

export async function exportData(
  bookmarksTree: BookmarkNode[],
): Promise<ExportData> {
  const [settings, metadata, snapshots] = await Promise.all([
    getSettings(),
    getMetadata(),
    listSnapshots(),
  ]);

  const data: ExportData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    settings,
    snapshots,
    bookmarksTree,
    metadata,
  };

  // 更新导出时间
  await saveMetadata({ ...metadata, lastExportAt: Date.now() });
  logger.info('Data exported', { snapshotCount: snapshots.length });
  return data;
}

// --- 导入校验 ---

export function validateImportData(
  data: unknown,
): { valid: true; data: ExportData } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '导入文件格式不合法' };
  }

  const d = data as Record<string, unknown>;

  if (typeof d.schemaVersion !== 'number') {
    return { valid: false, error: '缺少 schemaVersion 字段' };
  }

  if (d.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `schema 版本不兼容：文件版本 ${d.schemaVersion}，当前支持 ${CURRENT_SCHEMA_VERSION}`,
    };
  }

  if (!Array.isArray(d.bookmarksTree)) {
    return { valid: false, error: '缺少 bookmarksTree 字段' };
  }

  if (!d.settings || typeof d.settings !== 'object') {
    return { valid: false, error: '缺少 settings 字段' };
  }

  return { valid: true, data: data as ExportData };
}

// --- 导入恢复（仅恢复配置和元数据，书签写入由调用方完成）---

export async function importConfigData(data: ExportData): Promise<void> {
  await saveSettings(data.settings);
  await saveMetadata({
    ...data.metadata,
    lastImportAt: Date.now(),
  });
  logger.info('Config data imported');
}

export { CURRENT_SCHEMA_VERSION };
