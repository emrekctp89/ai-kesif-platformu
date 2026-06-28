/**
 * Loading Spinner Component
 * Reusable spinner for loading states
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Yükleniyor...',
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
        aria-busy="true"
        aria-label={label}
      />
      {label && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {label}
        </p>
      )}
    </div>
  );
}

/**
 * Loading Overlay Component
 * Full screen overlay with spinner
 */
export function LoadingOverlay({
  isVisible = true,
  message = 'Yükleniyor...',
  blur = true,
}) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center',
        blur && 'backdrop-blur-sm',
        'bg-background/50'
      )}
      role="status"
      aria-busy="true"
      aria-label={message}
    >
      <div className="bg-card p-8 rounded-lg shadow-lg border">
        <LoadingSpinner label={message} size="lg" />
      </div>
    </div>
  );
}

/**
 * Inline Loading Component
 * For use within containers
 */
export function InlineLoading({
  isLoading = true,
  label = 'Yükleniyor...',
  minHeight = '200px',
}) {
  if (!isLoading) return null;

  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight }}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <LoadingSpinner label={label} size="md" />
    </div>
  );
}

/**
 * Button Loading State
 * For use in buttons with loading state
 */
export function ButtonLoading({
  isLoading = false,
  children,
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (!isLoading) return children;

  return (
    <>
      <Loader2
        className={cn('animate-spin mr-2 inline', sizeClasses[size])}
        aria-hidden="true"
      />
      {children}
    </>
  );
}

/**
 * Skeleton Loading Component
 * For structured content loading
 */
export function SkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className = '',
}) {
  return (
    <div
      className={cn(
        'rounded bg-primary/10 animate-pulse',
        width,
        height,
        className
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonBlock({
  lines = 3,
  className = '',
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? 'w-5/6' : 'w-full'}
        />
      ))}
    </div>
  );
}

export default LoadingSpinner;
