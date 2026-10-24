import { SkeletonPage } from './Skeleton';

/**
 * Kept under its old name so every existing import keeps working, but it now renders a
 * skeleton layout instead of a spinner (less jarring, no layout jump when content arrives).
 */
export default function LoadingSpinner({ fullScreen = false, text = '' }) {
  if (fullScreen) return <SkeletonPage />;
  return (
    <div role="status" aria-live="polite" style={{ padding: 'var(--space-6) 0' }}>
      <span className="sr-only">{text || 'Loading…'}</span>
      <div className="wt-skeleton wt-skeleton--title" />
      <div className="wt-skeleton wt-skeleton--text" style={{ width: '85%' }} />
      <div className="wt-skeleton wt-skeleton--text" style={{ width: '60%' }} />
    </div>
  );
}
