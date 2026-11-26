import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'white' | 'dark' | 'ivory' | 'sage';
  className?: string;
}

const variantMap: Record<NonNullable<CardProps['variant']>, string> = {
  white:
    'bg-white border border-[#E4E2D9] text-[#171A18] dark:bg-[#171A18] dark:border-[#2B302C] dark:text-[#F4F3ED]',
  dark:
    'bg-[#171A18] border border-[#262A27] text-white dark:bg-[#151816] dark:border-[#323833]',
  ivory:
    'bg-[#FAF9F5] border border-[#E4E2D9] text-[#171A18] dark:bg-[#1E221F] dark:border-[#2B302C] dark:text-[#F4F3ED]',
  sage:
    'bg-[#DCE8D0] border border-[#C5D8B3] text-[#171A18] dark:bg-[#1B2816] dark:border-[#2F4726] dark:text-[#F4F3ED]',
};

export function Card({ children, variant = 'white', className = '' }: CardProps) {
  return (
    <div className={`rounded-[12px] shadow-[0_1px_2px_rgba(23,26,24,0.03)] dark:shadow-none ${variantMap[variant]} ${className}`}>
      {children}
    </div>
  );
}
