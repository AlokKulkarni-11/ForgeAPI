import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonVariant } from '../../types/app';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-primary hover:bg-accent-primary/90 text-white focus:ring-accent-primary',
  secondary:
    'bg-background-secondary hover:bg-background-border text-text-primary border border-background-border focus:ring-background-border',
  danger: 'bg-accent-danger hover:bg-accent-danger/90 text-white focus:ring-accent-danger',
  ghost:
    'hover:bg-background-secondary text-text-secondary hover:text-text-primary focus:ring-background-border',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle =
    'font-medium rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button className={`${baseStyle} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
