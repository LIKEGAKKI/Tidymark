import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '@/shared/messages';
import type { Snapshot, ExportData } from '@/types';
import { StatusView } from '@/shared/components/StatusView';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

export function DataTab() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    desc: string;
    action: () => Promise<void>;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSnapshots = async () => {
    try {
      const list = await sendMessage('SNAPSHOT_LIST', null);
      setSnapshots(list);
    } catch {
      setError('加载快照列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSnapshots(); }, []);

  const handleExport = async () => {
    const data = await sendMessage('EXPORT_DATA', null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tidymark-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        setConfirm({
          title: '确认导入',
          desc: '导入将覆盖当前书签结构和插件配置，此操作不可撤销（但会自动创建快照）。',
          action: async () => {
            await sendMessage('IMPORT_DATA', { data });
            await loadSnapshots();
            setConfirm(null);
          },
        });
      } catch {
        setError('文件格式不合法');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = (snap: Snapshot) => {
    setConfirm({
      title: '确认回滚',
      desc: `将恢复到 ${new Date(snap.createdAt).toLocaleString('zh-CN')} 的快照状态。`,
      action: async () => {
        await sendMessage('SNAPSHOT_RESTORE', { snapshotId: snap.id });
        await loadSnapshots();
        setConfirm(null);
      },
    });
  };

  const handleDelete = (snap: Snapshot) => {
    setConfirm({
      title: '删除快照',
      desc: '删除后无法恢复，确认删除？',
      action: async () => {
        await sendMessage('SNAPSHOT_DELETE', { snapshotId: snap.id });
        await loadSnapshots();
        setConfirm(null);
      },
    });
  };

  const typeLabel: Record<string, string> = {
    ai_reorganize: 'AI 分类',
    import_restore: '导入/恢复',
    bulk_delete: '批量删除',
  };

  return (
    <>
      <div className="space-y-6">
        {/* 导入导出 */}
        <div>
          <h2 className="text-base font-semibold">导入与导出</h2>
          <div className="mt-3 flex gap-3">
            <button onClick={handleExport} className="btn-secondary">导出数据</button>
            <button onClick={() => fileRef.current?.click()} className="btn-secondary">导入数据</button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </div>
        </div>

        {/* 快照列表 */}
        <div>
          <h2 className="text-base font-semibold">快照管理</h2>
          <p className="mt-1 text-xs text-gray-400">最多保留 10 份，超出自动淘汰最旧</p>
          <StatusView loading={loading} error={error} empty={snapshots.length === 0} emptyMessage="暂无快照">
            <ul className="mt-3 space-y-2">
              {snapshots.map((snap) => (
                <li key={snap.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <span className="text-sm font-medium">{typeLabel[snap.type] ?? snap.type}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(snap.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{snap.scope}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(snap)} className="text-xs text-indigo-600 hover:underline">回滚</button>
                    <button onClick={() => handleDelete(snap)} className="text-xs text-red-500 hover:underline">删除</button>
                  </div>
                </li>
              ))}
            </ul>
          </StatusView>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          description={confirm.desc}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
