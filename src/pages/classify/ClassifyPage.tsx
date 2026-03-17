import { useState } from 'react';
import { sendMessage } from '@/shared/messages';
import type { ClassifyResult } from '@/types';
import { ScopeSelector } from './ScopeSelector';
import { ClassifyEditor } from './ClassifyEditor';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

type Step = 'scope' | 'generating' | 'editing' | 'error';

export function ClassifyPage() {
  const [step, setStep] = useState<Step>('scope');
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState('');
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  const handleStart = async (folderIds: string[]) => {
    setScopeIds(folderIds);
    setStep('generating');
    setError('');
    try {
      const data = await sendMessage('CLASSIFY_START', { folderIds });
      setResult(data);
      setStep('editing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 分类失败');
      setStep('error');
    }
  };

  const handleRegenerate = () => {
    handleStart(scopeIds);
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      await sendMessage('CLASSIFY_APPLY', { result, scopeIds });
      setShowApplyConfirm(false);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用失败');
      setShowApplyConfirm(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold text-indigo-700">AI 智能分类</h1>

      {step === 'scope' && <div className="mt-6"><ScopeSelector onStart={handleStart} /></div>}

      {step === 'generating' && (
        <div className="mt-12 flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">AI 正在分析书签并生成分类方案...</p>
        </div>
      )}

      {step === 'error' && (
        <div className="mt-6">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
          <button onClick={() => setStep('scope')} className="mt-4 text-sm text-indigo-600 hover:underline">
            返回重新选择
          </button>
        </div>
      )}

      {step === 'editing' && result && !done && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              共 {result.categories.length} 个分类，{result.uncategorized.length} 个未分类
            </p>
            <div className="flex gap-3">
              <button onClick={handleRegenerate} className="text-sm text-gray-500 hover:underline">
                重新生成
              </button>
              <button
                onClick={() => setShowApplyConfirm(true)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                应用分类
              </button>
            </div>
          </div>
          <div className="mt-4">
            <ClassifyEditor result={result} onChange={setResult} />
          </div>
        </div>
      )}

      {done && (
        <div className="mt-12 text-center">
          <p className="text-lg font-medium text-green-600">分类已成功应用</p>
          <p className="mt-2 text-sm text-gray-400">操作前已自动创建快照，可在设置页回滚</p>
          <button onClick={() => { setDone(false); setStep('scope'); }} className="mt-4 text-sm text-indigo-600 hover:underline">
            继续分类
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showApplyConfirm}
        title="确认应用分类"
        description="将按当前编辑结果重组书签结构，操作前会自动创建快照。"
        details={
          <ul className="list-disc pl-4 space-y-1">
            <li>影响范围：{scopeIds.length === 0 ? '全部书签' : `${scopeIds.length} 个文件夹`}</li>
            <li>{result?.categories.length} 个分类，{result?.uncategorized.length} 个未分类</li>
          </ul>
        }
        confirmLabel={applying ? '应用中...' : '确认应用'}
        onConfirm={handleApply}
        onCancel={() => setShowApplyConfirm(false)}
      />
    </div>
  );
}
