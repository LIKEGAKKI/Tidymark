type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LOG_STORAGE_KEY = 'tidymark_logs';
const MAX_LOG_ENTRIES = 500;

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
  return entry.data ? `${base} ${JSON.stringify(entry.data)}` : base;
}

async function persistLog(entry: LogEntry): Promise<void> {
  try {
    const result = await chrome.storage.local.get(LOG_STORAGE_KEY);
    const logs: LogEntry[] = result[LOG_STORAGE_KEY] ?? [];
    logs.push(entry);

    // 超过上限时淘汰最旧的
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }

    await chrome.storage.local.set({ [LOG_STORAGE_KEY]: logs });
  } catch {
    // storage 不可用时静默降级到 console
  }
}

function createLogMethod(level: LogLevel, module: string) {
  return (message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    // 始终输出到 console
    const formatted = formatEntry(entry);
    const consoleFn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    consoleFn(formatted);

    // 异步持久化
    persistLog(entry);
  };
}

export function createLogger(module: string) {
  return {
    debug: createLogMethod('debug', module),
    info: createLogMethod('info', module),
    warn: createLogMethod('warn', module),
    error: createLogMethod('error', module),
  };
}

export async function exportLogs(): Promise<string> {
  const result = await chrome.storage.local.get(LOG_STORAGE_KEY);
  const logs: LogEntry[] = result[LOG_STORAGE_KEY] ?? [];
  return logs.map(formatEntry).join('\n');
}

export async function clearLogs(): Promise<void> {
  await chrome.storage.local.remove(LOG_STORAGE_KEY);
}
