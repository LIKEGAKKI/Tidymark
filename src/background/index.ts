import { createLogger } from '@/shared/utils/logger';
import { getFullTree, getSubTree } from '@/bookmarks';
import type { RequestMessage, ResponseMessage } from '@/shared/messages';
import { handleClassifyStart, handleClassifyApply } from './classify';
import { handleSearchQuery } from './search';
import { handleColdBookmarksQuery } from './cold';
import {
  handleBulkDelete,
  handleSnapshotRestore,
  handleExport,
  handleImport,
  handleGetSettings,
  handleSaveSettings,
  handleSnapshotList,
  handleSnapshotDelete,
} from './operations';

const logger = createLogger('background');

logger.info('Tidymark background service worker started');

// 注册 side panel 行为
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

// --- 消息路由 ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as RequestMessage;
  logger.debug('Received message', { type: msg.type });

  handleMessage(msg)
    .then((data) => sendResponse({ success: true, data } as ResponseMessage))
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err);
      logger.error('Message handler failed', { type: msg.type, error });
      sendResponse({ success: false, error } as ResponseMessage);
    });

  return true; // 保持消息通道开放（异步响应）
});

async function handleMessage(msg: RequestMessage): Promise<unknown> {
  switch (msg.type) {
    case 'CLASSIFY_START':
      return handleClassifyStart(msg.payload.folderIds);
    case 'CLASSIFY_APPLY':
      return handleClassifyApply(msg.payload.result, msg.payload.scopeIds);
    case 'SEARCH_QUERY':
      return handleSearchQuery(msg.payload.query);
    case 'COLD_BOOKMARKS_QUERY':
      return handleColdBookmarksQuery(msg.payload.filter);
    case 'BULK_DELETE':
      return handleBulkDelete(msg.payload.bookmarkIds);
    case 'SNAPSHOT_LIST':
      return handleSnapshotList();
    case 'SNAPSHOT_RESTORE':
      return handleSnapshotRestore(msg.payload.snapshotId);
    case 'SNAPSHOT_DELETE':
      return handleSnapshotDelete(msg.payload.snapshotId);
    case 'EXPORT_DATA':
      return handleExport();
    case 'IMPORT_DATA':
      return handleImport(msg.payload.data);
    case 'GET_SETTINGS':
      return handleGetSettings();
    case 'SAVE_SETTINGS':
      return handleSaveSettings(msg.payload.settings);
    case 'GET_BOOKMARK_TREE':
      return msg.payload.folderId
        ? getSubTree(msg.payload.folderId)
        : getFullTree();
    default:
      throw new Error(`Unknown message type: ${(msg as { type: string }).type}`);
  }
}
