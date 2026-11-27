import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Trash2, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

interface PendingConfirm extends ConfirmOptions {
  id: string;
  resolve: (value: boolean) => void;
}

interface ToastContextValue {
  notify: (tone: ToastTone, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneConfig: Record<
  ToastTone,
  { icon: typeof CheckCircle2; iconBg: string; border: string; defaultTitle: string }
> = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-[#DCE8D0] text-[#23331A] dark:bg-[#1E2E18] dark:text-[#C5F467]',
    border: 'border-[#C5D8B3] dark:border-[#2F4726]',
    defaultTitle: 'Success',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-[#FEE4E2] text-[#B42318] dark:bg-[#2B1514] dark:text-[#FCA5A5]',
    border: 'border-[#FECDCA] dark:border-[#5C2320]',
    defaultTitle: 'Action Failed',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-[#EAE8DF] text-[#171A18] dark:bg-[#2A2F2B] dark:text-[#C5F467]',
    border: 'border-[#DCDAD0] dark:border-[#343A35]',
    defaultTitle: 'Notice',
  },
  info: {
    icon: Info,
    iconBg: 'bg-[#C5F467] text-[#171A18]',
    border: 'border-[#E4E2D9] dark:border-[#2B302C]',
    defaultTitle: 'Vehixa',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (tone: ToastTone, message: string, title?: string) => {
      const cleanMsg = message.trim();
      if (!cleanMsg) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => {
        // Avoid identical duplicate toast stacked right away
        const deduped = prev.filter((t) => !(t.message === cleanMsg && t.tone === tone));
        return [{ id, tone, title, message: cleanMsg }, ...deduped].slice(0, 4);
      });

      const duration = tone === 'error' ? 5500 : 4000;
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  const success = useCallback(
    (message: string, title?: string) => notify('success', message, title),
    [notify],
  );
  const error = useCallback(
    (message: string, title?: string) => notify('error', message, title),
    [notify],
  );
  const warning = useCallback(
    (message: string, title?: string) => notify('warning', message, title),
    [notify],
  );
  const info = useCallback(
    (message: string, title?: string) => notify('info', message, title),
    [notify],
  );

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options;

    return new Promise<boolean>((resolve) => {
      setPendingConfirm((prev) => {
        if (prev) prev.resolve(false);
        return {
          id: `confirm-${Date.now()}`,
          title: normalized.title || 'Confirm Action',
          message: normalized.message,
          confirmLabel: normalized.confirmLabel || 'Delete',
          cancelLabel: normalized.cancelLabel || 'Cancel',
          tone: normalized.tone || 'danger',
          resolve,
        };
      });
    });
  }, []);

  const resolveConfirm = useCallback((answer: boolean) => {
    setPendingConfirm((prev) => {
      if (prev) prev.resolve(answer);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pendingConfirm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resolveConfirm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingConfirm, resolveConfirm]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ notify, success, error, warning, info, confirm }}>
      {children}

      {/* Top-Right Popup Card Stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[1200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 sm:right-5 sm:top-5"
      >
        {pendingConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            className="vehixa-toast-in pointer-events-auto rounded-[12px] border-2 border-[#171A18] bg-white p-4 shadow-xl dark:border-[#C5F467] dark:bg-[#171A18]"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                  pendingConfirm.tone === 'danger'
                    ? 'bg-[#FEE4E2] text-[#B42318] dark:bg-[#2B1514] dark:text-[#FCA5A5]'
                    : 'bg-[#C5F467] text-[#171A18]'
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">
                  {pendingConfirm.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5C615A] dark:text-[#B0B4AD]">
                  {pendingConfirm.message}
                </p>
                <div className="mt-3.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => resolveConfirm(false)}
                    className="rounded-[8px] border border-[#DCDAD0] bg-white px-3 py-1.5 text-xs font-semibold text-[#171A18] transition-colors hover:bg-[#F4F3ED] dark:border-[#343A35] dark:bg-[#1E221F] dark:text-[#F4F3ED] dark:hover:bg-[#262B27]"
                  >
                    {pendingConfirm.cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveConfirm(true)}
                    className={`rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${
                      pendingConfirm.tone === 'danger'
                        ? 'bg-[#B42318] text-white hover:bg-[#912018]'
                        : 'bg-[#C5F467] text-[#171A18] hover:bg-[#B4E94D]'
                    }`}
                  >
                    {pendingConfirm.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toasts.map((item) => {
          const cfg = toneConfig[item.tone];
          const Icon = cfg.icon;
          return (
            <div
              key={item.id}
              role="status"
              className={`vehixa-toast-in pointer-events-auto rounded-[12px] border bg-white/95 p-3.5 shadow-lg backdrop-blur-md dark:bg-[#171A18]/95 ${cfg.border}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${cfg.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#171A18] dark:text-[#F4F3ED]">
                    {item.title || cfg.defaultTitle}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#5C615A] dark:text-[#B0B4AD]">
                    {item.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-[#7D827A] transition-colors hover:bg-[#F4F3ED] hover:text-[#171A18] dark:hover:bg-[#232724] dark:hover:text-[#F4F3ED]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
