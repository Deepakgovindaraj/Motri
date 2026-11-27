import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#171A18]/50 p-4 backdrop-blur-[2px] dark:bg-black/70">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] border border-[#E4E2D9] bg-white p-6 shadow-xl sm:p-7 dark:border-[#2B302C] dark:bg-[#171A18]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#ECEAE2] pb-4 dark:border-[#262B27]">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-[#7D827A] dark:text-[#8E938B]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#7D827A] transition-colors hover:bg-[#F4F3ED] hover:text-[#171A18] dark:text-[#8E938B] dark:hover:bg-[#232724] dark:hover:text-[#F4F3ED]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
