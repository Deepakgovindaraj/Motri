import React from 'react';

export type StatusTone = 'positive' | 'warning' | 'danger' | 'active' | 'neutral';

const toneClasses: Record<StatusTone, { dot: string; text: string; bg: string }> = {
  positive: { dot: 'bg-[#3A6B24]', text: 'text-[#23331A]', bg: 'bg-[#DCE8D0]' },
  active: { dot: 'bg-[#171A18]', text: 'text-[#171A18]', bg: 'bg-[#C5F467]' },
  warning: { dot: 'bg-[#7A5AF8]', text: 'text-[#171A18]', bg: 'bg-[#EAE8DF]' },
  danger: { dot: 'bg-[#B42318]', text: 'text-[#B42318]', bg: 'bg-[#FEE4E2]' },
  neutral: { dot: 'bg-[#A6AAA3]', text: 'text-[#5C615A]', bg: 'bg-[#F4F3ED]' },
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
