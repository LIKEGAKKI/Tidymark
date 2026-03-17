import type {
  ClassifyResult,
  SearchResultItem,
  ColdBookmarkItem,
  ColdFilterPreset,
  Snapshot,
  AiSettings,
  ExportData,
  BookmarkNode,
} from '@/types';

// --- 请求消息定义 ---

export type RequestMessage =
  | { type: 'CLASSIFY_START'; payload: { folderIds: string[] } }
  | { type: 'CLASSIFY_APPLY'; payload: { result: ClassifyResult; scopeIds: string[] } }
  | { type: 'SEARCH_QUERY'; payload: { query: string } }
  | { type: 'COLD_BOOKMARKS_QUERY'; payload: { filter: ColdFilterPreset } }
  | { type: 'BULK_DELETE'; payload: { bookmarkIds: string[] } }
  | { type: 'SNAPSHOT_LIST'; payload: null }
  | { type: 'SNAPSHOT_RESTORE'; payload: { snapshotId: string } }
  | { type: 'SNAPSHOT_DELETE'; payload: { snapshotId: string } }
  | { type: 'EXPORT_DATA'; payload: null }
  | { type: 'IMPORT_DATA'; payload: { data: ExportData } }
  | { type: 'GET_SETTINGS'; payload: null }
  | { type: 'SAVE_SETTINGS'; payload: { settings: AiSettings } }
  | { type: 'GET_BOOKMARK_TREE'; payload: { folderId?: string } };

// --- 响应消息定义 ---

export type ResponseMessage<T = unknown> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

// --- 各消息类型对应的响应数据 ---

export interface ResponseDataMap {
  CLASSIFY_START: ClassifyResult;
  CLASSIFY_APPLY: void;
  SEARCH_QUERY: SearchResultItem[];
  COLD_BOOKMARKS_QUERY: ColdBookmarkItem[];
  BULK_DELETE: void;
  SNAPSHOT_LIST: Snapshot[];
  SNAPSHOT_RESTORE: void;
  SNAPSHOT_DELETE: void;
  EXPORT_DATA: ExportData;
  IMPORT_DATA: void;
  GET_SETTINGS: AiSettings;
  SAVE_SETTINGS: void;
  GET_BOOKMARK_TREE: BookmarkNode[];
}

// --- 类型安全的消息发送工具 ---

export async function sendMessage<T extends RequestMessage['type']>(
  type: T,
  payload: Extract<RequestMessage, { type: T }>['payload'],
): Promise<ResponseDataMap[T]> {
  const response = await chrome.runtime.sendMessage({ type, payload });
  const msg = response as ResponseMessage<ResponseDataMap[T]>;

  if (!msg.success) {
    throw new Error(msg.error);
  }

  return msg.data;
}
