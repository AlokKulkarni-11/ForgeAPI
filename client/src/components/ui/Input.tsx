import type { InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  className?: string;
  inputClassName?: string;
}

export function Input({
  label,
  type = 'text',
  className = '',
  inputClassName = '',
  ...props
}: InputProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>}
      <input
        type={type}
        className={`w-full bg-background-primary text-text-primary border border-background-border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors ${inputClassName}`}
        {...props}
      />
    </div>
  );
}
