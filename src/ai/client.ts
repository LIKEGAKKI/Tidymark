import { getSettings } from '@/storage/settings';
import { createLogger } from '@/shared/utils/logger';
import type { AppError } from '@/types';

const logger = createLogger('ai-client');
const DEFAULT_TIMEOUT = 60_000;

// --- 请求/响应类型 ---

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

// --- 配置校验 ---

export async function ensureAiConfigured(): Promise<
  { ready: true } | { ready: false; error: AppError }
> {
  const settings = await getSettings();

  if (!settings.apiEndpoint || !settings.apiKey || !settings.model) {
    return {
      ready: false,
      error: {
        code: 'AI_CONFIG_MISSING',
        message: '请先在设置页配置 AI 服务（API Endpoint、API Key、模型名称）',
        hasModifiedState: false,
      },
    };
  }

  if (!settings.hasConfirmedOutboundNotice) {
    return {
      ready: false,
      error: {
        code: 'AI_CONFIG_MISSING',
        message: '请先确认数据出站说明',
        hasModifiedState: false,
      },
    };
  }

  return { ready: true };
}

// --- 核心调用 ---

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; timeout?: number },
): Promise<string> {
  const settings = await getSettings();
  const endpoint = settings.apiEndpoint.replace(/\/+$/, '');
  const url = `${endpoint}/v1/chat/completions`;

  const body: ChatCompletionRequest = {
    model: settings.model,
    messages,
    temperature: options?.temperature ?? 0.3,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeout ?? DEFAULT_TIMEOUT,
  );

  try {
    logger.info('Sending chat completion request', {
      messageCount: messages.length,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`AI 服务返回错误 (${response.status}): ${text}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI 服务返回了空内容');
    }

    logger.info('Chat completion succeeded');
    return content;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'AI 调用发生未知错误';
    logger.error('Chat completion failed', { error: message });
    throw {
      code: 'AI_CALL_FAILED',
      message,
      hasModifiedState: false,
    } satisfies AppError;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- 解析 JSON 响应 ---

export function parseJsonResponse<T>(raw: string): T {
  // 尝试从 markdown code block 中提取 JSON
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw.trim();
  return JSON.parse(jsonStr) as T;
}
