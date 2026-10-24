import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, PageHeader, Pill, ProgressBar, SkeletonList } from './ui';
import { fmtDate, useAsync } from './format';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'progress', label: 'In progress' },
  { id: 'new', label: 'Not started' },
  { id: 'done', label: 'Completed' },
];

export default function MyCourses() {
  const { loading, error, data, reload } = useAsync(() => api.getMyLearning());
  const [filter, setFilter] = useState('all');
  const courses = useMemo(() => (data?.courses || []).filter((c) => c.course && typeof c.course === 'object'), [data]);
  const shown = courses.filter((c) => (
    filter === 'all' ? true
      : filter === 'done' ? c.completed
        : filter === 'new' ? !c.completed && !c.progress
          : !c.completed && c.progress > 0));

  return (
    <div className="acc-stack">
      <PageHeader icon="book" title="My courses" subtitle="Pick up where you left off. Progress saves automatically." actions={<Link to="/all-courses" className="wt-btn wt-btn--secondary wt-btn--sm"><Icon name="search" size={16} />Browse courses</Link>} />
      {courses.length > 0 && (
        <div className="acc-filters" role="group" aria-label="Filter courses">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`wt-chip${filter === f.id ? ' is-active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      )}
      {loading && !data ? <SkeletonList rows={3} media /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !courses.length ? (
        <EmptyState icon="book" title="You have not joined a course yet" text="When you enrol, your courses appear here with progress, resume and downloads." cta="Browse courses" ctaTo="/all-courses" />
      ) : !shown.length ? (
        <EmptyState icon="search" title="Nothing here" text="No courses match this filter." cta="Show all" onCta={() => setFilter('all')} />
      ) : (
        <ul className="acc-course-grid">
          {shown.map((c) => {
            const started = c.progress > 0;
            return (
              <li key={c.course._id} className="acc-card acc-course">
                <Link to={`/course/${c.course._id}`} className="acc-course__media" tabIndex={-1} aria-hidden="true">
                  <img src={c.course.thumbnail || '/placeholders/course.svg'} alt="" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholders/course.svg'; }} />
                  {c.completed && <span className="acc-course__done"><Icon name="check-circle" size={16} />Completed</span>}
                </Link>
                <div className="acc-course__body">
                  <h2 className="acc-course__title"><Link to={`/course/${c.course._id}`}>{c.course.title}</Link></h2>
                  <p className="acc-muted acc-course__meta">
                    {c.modules ? `${c.modules} module${c.modules === 1 ? '' : 's'}` : ''}
                    {c.totalLessons ? ` · ${c.completedLessons}/${c.totalLessons} lessons` : ''}
                    {c.durationLabel ? ` · ${c.durationLabel}` : ''}
                  </p>
                  <ProgressBar value={c.progress} label={`${c.course.title} progress`} />
                  {c.lastWatchedLesson && !c.completed && <p className="acc-course__next"><Icon name="play" size={14} />Next: {c.lastWatchedLesson.title}</p>}
                  <div className="acc-course__actions">
                    <Link to={`/course/${c.course._id}`} className="wt-btn wt-btn--primary wt-btn--sm">
                      <Icon name="play" size={16} />{c.completed ? 'Review' : started ? 'Resume' : 'Start course'}
                    </Link>
                    {c.completed ? (
                      <Link to="/dashboard/certificates" className="wt-btn wt-btn--ghost wt-btn--sm"><Icon name="award" size={16} />Certificate</Link>
                    ) : (
                      <span className="acc-muted acc-small">{c.enrolledAt ? `Joined ${fmtDate(c.enrolledAt)}` : ''}</span>
                    )}
                  </div>
                  {c.completed && c.completedAt && <Pill tone="success" icon="award">Finished {fmtDate(c.completedAt)}</Pill>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="acc-muted acc-small"><Icon name="lock" size={14} /> Lesson files and downloads open inside the course player and are only available to enrolled students.</p>
    </div>
  );
}
