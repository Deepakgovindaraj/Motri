import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'white' | 'dark' | 'ivory' | 'sage';
  className?: string;
}

const variantMap: Record<NonNullable<CardProps['variant']>, string> = {
  white: 'bg-white border border-[#E4E2D9] text-[#171A18]',
  dark: 'bg-[#171A18] border border-[#262A27] text-white',
  ivory: 'bg-[#FAF9F5] border border-[#E4E2D9] text-[#171A18]',
  sage: 'bg-[#DCE8D0] border border-[#C5D8B3] text-[#171A18]',
};

export function Card({ children, variant = 'white', className = '' }: CardProps) {
  return (
    <div className={`rounded-[12px] shadow-[0_1px_2px_rgba(23,26,24,0.03)] ${variantMap[variant]} ${className}`}>
      {children}
    </div>
  );
}
