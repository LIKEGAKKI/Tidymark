import { useState, useEffect } from 'react';
import { sendMessage } from '@/shared/messages';
import type { AiSettings } from '@/types';
import { StatusView } from '@/shared/components/StatusView';

export function SettingsTab() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    sendMessage('GET_SETTINGS', null)
      .then(setSettings)
      .catch(() => setMessage('加载设置失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      await sendMessage('SAVE_SETTINGS', { settings });
      setMessage('保存成功');
    } catch {
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const update = (patch: Partial<AiSettings>) => {
    if (settings) setSettings({ ...settings, ...patch });
  };

  return (
    <StatusView loading={loading}>
      {settings && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold">AI 服务配置</h2>
            <p className="mt-1 text-xs text-gray-400">
              配置 OpenAI 兼容格式的 API 服务
            </p>
          </div>

          <Field label="API Endpoint">
            <input
              type="url"
              value={settings.apiEndpoint}
              onChange={(e) => update({ apiEndpoint: e.target.value })}
              placeholder="https://api.openai.com"
              className="input-field"
            />
          </Field>

          <Field label="API Key">
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="input-field"
            />
          </Field>

          <Field label="模型名称">
            <input
              type="text"
              value={settings.model}
              onChange={(e) => update({ model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="input-field"
            />
          </Field>

          {/* 数据出站说明 */}
          <div className="rounded-md bg-amber-50 p-3">
            <p className="text-xs text-amber-700">
              使用 AI 功能时，所选范围内的书签标题和 URL 会发送到你配置的模型服务。
            </p>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={settings.hasConfirmedOutboundNotice}
                onChange={(e) =>
                  update({ hasConfirmedOutboundNotice: e.target.checked })
                }
              />
              <span className="text-gray-600">我已了解并同意数据出站</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
            {message && (
              <span className="text-sm text-gray-500">{message}</span>
            )}
          </div>
        </div>
      )}
    </StatusView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
