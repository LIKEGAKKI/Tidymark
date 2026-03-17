import type { AiSettings, AppMetadata, LocalUiState } from '@/types';

// --- Storage Keys ---

const KEYS = {
  settings: 'tidymark_settings',
  metadata: 'tidymark_metadata',
  uiState: 'tidymark_ui_state',
  snapshots: 'tidymark_snapshots',
} as const;

// --- 默认值 ---

const DEFAULT_SETTINGS: AiSettings = {
  apiEndpoint: '',
  apiKey: '',
  model: '',
  hasConfirmedOutboundNotice: false,
};

const DEFAULT_METADATA: AppMetadata = {
  schemaVersion: 1,
  lastExportAt: null,
  lastImportAt: null,
  lastAiRunAt: null,
};

const DEFAULT_UI_STATE: LocalUiState = {
  lastColdFilter: 'never_used',
  lastClassifyScope: [],
  searchHistory: [],
};

// --- 通用读写 ---

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T) ?? fallback;
}

async function set<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// --- Settings ---

export async function getSettings(): Promise<AiSettings> {
  return get(KEYS.settings, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: AiSettings): Promise<void> {
  await set(KEYS.settings, settings);
}

// --- Metadata ---

export async function getMetadata(): Promise<AppMetadata> {
  return get(KEYS.metadata, DEFAULT_METADATA);
}

export async function saveMetadata(metadata: AppMetadata): Promise<void> {
  await set(KEYS.metadata, metadata);
}

// --- UI State ---

export async function getUiState(): Promise<LocalUiState> {
  return get(KEYS.uiState, DEFAULT_UI_STATE);
}

export async function saveUiState(state: LocalUiState): Promise<void> {
  await set(KEYS.uiState, state);
}

export { KEYS, DEFAULT_SETTINGS, DEFAULT_METADATA };
