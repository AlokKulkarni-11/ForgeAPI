import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-background-card border border-background-border rounded-xl shadow-lg ${className}`}>
      {children}
    </div>
  );
}
