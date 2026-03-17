import { useState } from 'react';
import { SettingsTab } from './SettingsTab';
import { DataTab } from './DataTab';

type Tab = 'settings' | 'data';

export function Options() {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-indigo-700">Tidymark 设置</h1>

      <div className="mt-4 flex gap-4 border-b">
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          AI 配置
        </TabButton>
        <TabButton active={tab === 'data'} onClick={() => setTab('data')}>
          数据管理
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === 'settings' && <SettingsTab />}
        {tab === 'data' && <DataTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-sm font-medium transition ${
        active
          ? 'border-b-2 border-indigo-600 text-indigo-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
