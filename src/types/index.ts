// ============================================================
// Tidymark 全局类型定义
// ============================================================

// --- AI 服务配置 ---

export interface AiSettings {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  hasConfirmedOutboundNotice: boolean;
}

// --- 插件元数据 ---

export interface AppMetadata {
  schemaVersion: number;
  lastExportAt: number | null;
  lastImportAt: number | null;
  lastAiRunAt: number | null;
}

// --- 快照 ---

export type SnapshotType = 'ai_reorganize' | 'import_restore' | 'bulk_delete';

export interface Snapshot {
  id: string;
  createdAt: number;
  type: SnapshotType;
  scope: string;
  bookmarksTree: BookmarkNode[];
  metadata: AppMetadata;
}

// --- 书签 ---

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  index?: number;
  dateAdded?: number;
  dateLastUsed?: number;
  children?: BookmarkNode[];
}

// --- 冷门书签筛选 ---

export type ColdFilterPreset =
  | 'never_used'
  | 'over_30_days'
  | 'over_90_days'
  | 'over_180_days';

export interface ColdBookmarkItem {
  bookmark: BookmarkNode;
  folderPath: string;
  daysSinceLastUsed: number | null;
}

// --- AI 分类（支持最多两级结构）---

export interface CategorySkeleton {
  name: string;
  description: string;
  subCategories?: CategorySkeleton[];
}

export interface CategoryGroup {
  name: string;
  bookmarks: BookmarkNode[];
  subGroups?: CategoryGroup[];
}

export interface ClassifyResult {
  categories: CategoryGroup[];
  uncategorized: BookmarkNode[];
}

// --- AI 搜索 ---

export interface SearchResultItem {
  bookmark: BookmarkNode;
  folderPath: string;
  reason: string;
  score: number;
}

// --- 导入导出 ---

export interface ExportData {
  schemaVersion: number;
  exportedAt: number;
  settings: AiSettings;
  snapshots: Snapshot[];
  bookmarksTree: BookmarkNode[];
  metadata: AppMetadata;
}

// --- UI 本地状态 ---

export interface LocalUiState {
  lastColdFilter: ColdFilterPreset;
  lastClassifyScope: string[];
  searchHistory: string[];
}

// --- 消息通信（UI ↔ background）---

export type MessageType =
  | 'CLASSIFY_START'
  | 'CLASSIFY_RESULT'
  | 'CLASSIFY_APPLY'
  | 'SEARCH_QUERY'
  | 'SEARCH_RESULT'
  | 'COLD_BOOKMARKS_QUERY'
  | 'COLD_BOOKMARKS_RESULT'
  | 'BULK_DELETE'
  | 'SNAPSHOT_CREATE'
  | 'SNAPSHOT_LIST'
  | 'SNAPSHOT_RESTORE'
  | 'SNAPSHOT_DELETE'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'ERROR';

export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- 错误类型 ---

export type AppErrorCode =
  | 'AI_CONFIG_MISSING'
  | 'AI_CALL_FAILED'
  | 'SNAPSHOT_WRITE_FAILED'
  | 'BOOKMARK_WRITE_FAILED'
  | 'IMPORT_FORMAT_INVALID'
  | 'SCHEMA_VERSION_INCOMPATIBLE';

export interface AppError {
  code: AppErrorCode;
  message: string;
  hasModifiedState: boolean;
}
