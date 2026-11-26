import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#C5F467] text-[#171A18] hover:bg-[#B4E94D] focus:ring-[#171A18] font-semibold border border-[#B4E94D]/60 disabled:opacity-60',
  secondary:
    'bg-[#171A18] text-white hover:bg-[#232724] focus:ring-[#171A18] font-semibold disabled:opacity-60',
  outline:
    'border border-[#DCDAD0] bg-white text-[#171A18] hover:bg-[#F4F3ED] focus:ring-[#171A18]',
  danger:
    'border border-[#F3C6C2] bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE4E2] focus:ring-[#B42318]',
  ghost:
    'text-[#5C615A] hover:bg-[#EAE8DF] hover:text-[#171A18] focus:ring-[#171A18]',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#F4F3ED] disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
