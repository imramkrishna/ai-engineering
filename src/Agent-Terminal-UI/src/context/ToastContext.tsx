import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 4200 }: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, description, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  // Listen to global interceptor events from src/services/api.ts
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        type: ToastType;
        title: string;
        description?: string;
      }>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const iconMap = {
            success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
            error: <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
            info: <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />,
          };

          const borderMap = {
            success: 'border-emerald-500/30 bg-white/95 dark:bg-zinc-900/95',
            error: 'border-rose-500/30 bg-white/95 dark:bg-zinc-900/95',
            warning: 'border-amber-500/30 bg-white/95 dark:bg-zinc-900/95',
            info: 'border-sky-500/30 bg-white/95 dark:bg-zinc-900/95',
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 ${borderMap[t.type]}`}
            >
              {iconMap[t.type]}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 break-words leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
