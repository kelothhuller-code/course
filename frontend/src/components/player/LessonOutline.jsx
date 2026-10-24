import Icon from '../Icon';

/**
 * Compact course outline shown beside the lesson player on wide screens.
 * Lesson N unlocks once lesson N-1 is complete (same rule as the existing chapter list).
 */
export default function LessonOutline({ lessons, activeId, isCompleted, isAdmin, onSelect, onLocked, progress }) {
  const done = lessons.filter((l) => isCompleted(l._id)).length;
  return (
    <nav className="lp-outline" aria-label="Course outline">
      <div className="lp-outline__head">
        <strong>Course outline</strong>
        <span>{done} of {lessons.length} done</span>
      </div>
      <div className="lp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Course progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <ol className="lp-outline__list">
        {lessons.map((lesson, idx) => {
          const active = activeId && String(activeId) === String(lesson._id);
          const complete = isCompleted(lesson._id);
          const locked = !isAdmin && idx > 0 && !isCompleted(lessons[idx - 1]._id);
          return (
            <li key={lesson._id || idx}>
              <button
                type="button"
                className={`lp-outline__item${active ? ' is-active' : ''}${complete ? ' is-done' : ''}${locked ? ' is-locked' : ''}`}
                aria-current={active ? 'step' : undefined}
                aria-disabled={locked || undefined}
                onClick={() => (locked ? onLocked() : onSelect(lesson))}
              >
                <span className="lp-outline__num" aria-hidden="true">
                  {complete ? <Icon name="check" size={14} strokeWidth={2.4} /> : locked ? <Icon name="lock" size={13} /> : idx + 1}
                </span>
                <span className="lp-outline__text">
                  <span className="lp-outline__title">{lesson.title || `Lesson ${idx + 1}`}</span>
                  <span className="lp-outline__meta">
                    {active ? 'Now playing' : complete ? 'Completed' : locked ? 'Finish the previous lesson to unlock' : lesson.duration || 'Lesson'}
                  </span>
                </span>
                {active && <Icon name="play" size={16} className="lp-outline__play" />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
