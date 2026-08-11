import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
export function Button({
  className,
  variant = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' }) {
  return (
    <button
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'danger' && 'btn-danger',
        className,
      )}
      {...props}
    />
  );
}
