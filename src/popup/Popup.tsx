import { useEffect, useState } from 'react';
import { sendMessage } from '@/shared/messages';
import type { AiSettings, Snapshot } from '@/types';

export function Popup() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    sendMessage('GET_SETTINGS', null).then(setSettings).catch(() => {});
    sendMessage('SNAPSHOT_LIST', null).then(setSnapshots).catch(() => {});
  }, []);

  const aiConfigured = settings?.apiEndpoint && settings?.apiKey && settings?.model;
  const latestSnapshot = snapshots[snapshots.length - 1];

  const openPage = (path: string) => {
    chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  };

  const openSidePanel = async () => {
    const window = await chrome.windows.getCurrent();
    if (window.id != null) {
      await chrome.sidePanel.open({ windowId: window.id });
    }
  };

  return (
    <div className="w-80 p-4">
      <h1 className="text-lg font-bold text-indigo-700">Tidymark</h1>
      <p className="mt-1 text-xs text-gray-400">AI 书签管理助手</p>

      {/* AI 配置状态 */}
      <div className="mt-4 rounded-md bg-gray-50 p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${aiConfigured ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-gray-600">
            {aiConfigured ? 'AI 已配置' : 'AI 未配置'}
          </span>
        </div>
        {latestSnapshot && (
          <p className="mt-1 text-xs text-gray-400">
            最近快照：{new Date(latestSnapshot.createdAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>

      {/* 功能入口 */}
      <div className="mt-4 space-y-2">
        <NavButton
          label="AI 智能分类"
          desc="选择范围，AI 帮你重组书签"
          onClick={() => openPage('src/pages/classify.html')}
        />
        <NavButton
          label="AI 语义搜索"
          desc="用自然语言找回收藏的书签"
          onClick={openSidePanel}
        />
        <NavButton
          label="冷门书签"
          desc="发现长期未使用的书签"
          onClick={() => openPage('src/pages/cold.html')}
        />
        <NavButton
          label="设置与数据"
          desc="AI 配置、快照管理、导入导出"
          onClick={() => chrome.runtime.openOptionsPage()}
        />
      </div>
    </div>
  );
}

function NavButton({
  label,
  desc,
  onClick,
}: {
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border border-gray-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
    >
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <span className="mt-0.5 block text-xs text-gray-400">{desc}</span>
    </button>
  );
}
