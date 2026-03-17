interface StatusViewProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function StatusView({
  loading,
  error,
  empty,
  emptyMessage = '暂无数据',
  children,
}: StatusViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
