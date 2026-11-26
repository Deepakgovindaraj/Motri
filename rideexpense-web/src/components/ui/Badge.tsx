import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'sage' | 'lime' | 'graphite' | 'danger' | 'amber' | 'blue' | 'green' | 'red';
}

const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-[#F4F3ED] text-[#5C615A] border border-[#E4E2D9]',
  sage: 'bg-[#DCE8D0] text-[#23331A] border border-[#C5D8B3]',
  lime: 'bg-[#C5F467] text-[#171A18] font-semibold',
  graphite: 'bg-[#171A18] text-white',
  danger: 'bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA]',
  amber: 'bg-[#F4F3ED] text-[#171A18] border border-[#171A18]/25',
  // Legacy aliases mapped cleanly into the Graphite × Ivory × Electric Lime system
  blue: 'bg-[#DCE8D0] text-[#171A18] border border-[#C5D8B3]',
  green: 'bg-[#DCE8D0] text-[#23331A] border border-[#C5D8B3]',
  red: 'bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA]',
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
