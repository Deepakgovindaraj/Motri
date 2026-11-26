import React from 'react';

export type StatusTone = 'positive' | 'warning' | 'danger' | 'active' | 'neutral';

const toneClasses: Record<StatusTone, { dot: string; text: string; bg: string }> = {
  positive: {
    dot: 'bg-[#3A6B24] dark:bg-[#C5F467]',
    text: 'text-[#23331A] dark:text-[#C5F467]',
    bg: 'bg-[#DCE8D0] dark:bg-[#1E2E18]',
  },
  active: { dot: 'bg-[#171A18]', text: 'text-[#171A18]', bg: 'bg-[#C5F467]' },
  warning: {
    dot: 'bg-[#7A5AF8] dark:bg-[#C5F467]',
    text: 'text-[#171A18] dark:text-[#F4F3ED]',
    bg: 'bg-[#EAE8DF] dark:bg-[#2A2F2B]',
  },
  danger: {
    dot: 'bg-[#B42318] dark:bg-[#FCA5A5]',
    text: 'text-[#B42318] dark:text-[#FCA5A5]',
    bg: 'bg-[#FEE4E2] dark:bg-[#2B1514]',
  },
  neutral: {
    dot: 'bg-[#A6AAA3]',
    text: 'text-[#5C615A] dark:text-[#B0B4AD]',
    bg: 'bg-[#F4F3ED] dark:bg-[#232724]',
  },
};

export function StatusIndicator({
  tone = 'neutral',
  label,
}: {
  tone?: StatusTone;
  label: React.ReactNode;
}) {
  const c = toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}
