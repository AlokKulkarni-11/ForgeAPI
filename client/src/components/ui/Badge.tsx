import type { ReactNode } from 'react';
import type { BadgeVariant } from '../../types/app';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  success: 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20',
  warning: 'bg-accent-warning/10 text-accent-warning border border-accent-warning/20',
  danger: 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20',
  neutral: 'bg-background-secondary text-text-secondary border border-background-border',
};

export function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export type { BadgeVariant };
