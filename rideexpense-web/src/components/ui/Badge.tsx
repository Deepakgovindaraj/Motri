import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'sage' | 'lime' | 'graphite' | 'danger' | 'amber' | 'blue' | 'green' | 'red';
}

const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral:
    'bg-[#F4F3ED] text-[#5C615A] border border-[#E4E2D9] dark:bg-[#232724] dark:text-[#B0B4AD] dark:border-[#343A35]',
  sage:
    'bg-[#DCE8D0] text-[#23331A] border border-[#C5D8B3] dark:bg-[#1E2E18] dark:text-[#C5F467] dark:border-[#2F4726]',
  lime: 'bg-[#C5F467] text-[#171A18] font-semibold',
  graphite:
    'bg-[#171A18] text-white dark:bg-[#2A2F2B] dark:text-[#F4F3ED] dark:border dark:border-[#3B423D]',
  danger:
    'bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA] dark:bg-[#2B1514] dark:text-[#FCA5A5] dark:border-[#5C2320]',
  amber:
    'bg-[#F4F3ED] text-[#171A18] border border-[#171A18]/25 dark:bg-[#262B27] dark:text-[#F4F3ED] dark:border-[#3B423D]',
  // Legacy aliases mapped cleanly into the Graphite × Ivory × Electric Lime system
  blue:
    'bg-[#DCE8D0] text-[#171A18] border border-[#C5D8B3] dark:bg-[#1E2E18] dark:text-[#C5F467] dark:border-[#2F4726]',
  green:
    'bg-[#DCE8D0] text-[#23331A] border border-[#C5D8B3] dark:bg-[#1E2E18] dark:text-[#C5F467] dark:border-[#2F4726]',
  red:
    'bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA] dark:bg-[#2B1514] dark:text-[#FCA5A5] dark:border-[#5C2320]',
};

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[8px] px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
