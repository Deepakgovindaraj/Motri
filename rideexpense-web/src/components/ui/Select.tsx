import React from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, className = '', ...rest }, ref) => {
    const selectId = id || rest.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-[0.06em] text-[#5C615A] dark:text-[#A6AAA3]"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`block w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-[#171A18] transition-colors focus:outline-none focus:ring-2 dark:bg-[#1E221F] dark:text-[#F4F3ED] ${
            error
              ? 'border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/15 dark:border-[#F87171]'
              : 'border-[#DCDAD0] focus:border-[#171A18] focus:ring-[#171A18]/10 dark:border-[#343A35] dark:focus:border-[#C5F467] dark:focus:ring-[#C5F467]/15'
          } ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs font-medium text-[#B42318] dark:text-[#FCA5A5]">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
