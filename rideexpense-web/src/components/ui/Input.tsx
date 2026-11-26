import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const inputId = id || rest.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-[0.06em] text-[#5C615A] dark:text-[#A6AAA3]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`block w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-[#171A18] placeholder-[#A6AAA3] transition-colors focus:outline-none focus:ring-2 disabled:bg-[#F4F3ED] disabled:text-[#7D827A] dark:bg-[#1E221F] dark:text-[#F4F3ED] dark:placeholder-[#7D827A] dark:disabled:bg-[#141715] dark:disabled:text-[#7D827A] ${
            error
              ? 'border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/15 dark:border-[#F87171]'
              : 'border-[#DCDAD0] focus:border-[#171A18] focus:ring-[#171A18]/10 dark:border-[#343A35] dark:focus:border-[#C5F467] dark:focus:ring-[#C5F467]/15'
          } ${className}`}
          {...rest}
        />
        {error && <p className="text-xs font-medium text-[#B42318] dark:text-[#FCA5A5]">{error}</p>}
        {!error && hint && <p className="text-xs text-[#7D827A] dark:text-[#8E938B]">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
