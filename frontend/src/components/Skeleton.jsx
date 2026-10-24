/** Skeleton placeholders shown while data loads (instead of spinners). */
export function SkeletonCard({ media = true, lines = 3 }) {
  return (
    <div className="wt-card wt-card--flush" aria-hidden="true">
      {media && <div className="wt-skeleton wt-skeleton--media" />}
      <div className="wt-card__body">
        <div className="wt-skeleton wt-skeleton--title" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="wt-skeleton wt-skeleton--text" style={{ width: `${92 - i * 14}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, media = true, label = 'Loading…', className = 'wt-grid wt-grid--3' }) {
  return (
    <div className={className} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} media={media} />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="wt-container wt-section" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="wt-skeleton wt-skeleton--title" style={{ width: '40%', height: '2.2rem', marginBottom: '1rem' }} />
      <div className="wt-skeleton wt-skeleton--text" style={{ width: '70%' }} />
      <div className="wt-skeleton wt-skeleton--text" style={{ width: '55%', marginBottom: '2rem' }} />
      <SkeletonGrid count={3} label="" />
    </div>
  );
}
