'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
type Notice = { id: number; message: string; tone: 'success' | 'error' };
const ToastContext = createContext<(message: string, tone?: Notice['tone']) => void>(
  () => undefined,
);
export const useToast = () => useContext(ToastContext);
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );
  const [notices, setNotices] = useState<Notice[]>([]);
  const toast = (message: string, tone: Notice['tone'] = 'success') => {
    const id = Date.now();
    setNotices((all) => [...all, { id, message, tone }]);
    setTimeout(() => setNotices((all) => all.filter((n) => n.id !== id)), 4000);
  };
  return (
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={toast}>
        {children}
        <div className="fixed bottom-5 right-5 z-[100] space-y-2">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`flex max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-xl ${notice.tone === 'error' ? 'border-red-200 text-red-800' : 'border-emerald-200 text-slate-800'}`}
            >
              {notice.tone === 'success' && (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              )}
              <span className="flex-1">{notice.message}</span>
              <button onClick={() => setNotices((all) => all.filter((n) => n.id !== notice.id))}>
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
