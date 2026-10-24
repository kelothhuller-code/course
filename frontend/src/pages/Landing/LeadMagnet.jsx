import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

/**
 * Free lead magnet, driven by real data:
 *  1. a free trial lesson (admin → Trials), or
 *  2. a free course (price 0 / marked free).
 * If neither exists nothing is shown publicly (a dashed placeholder appears in development).
 */
export default function LeadMagnet({ trials = [], courses = [] }) {
  const trial = trials.find((t) => t && t.title);
  const freeCourse = !trial ? courses.find((c) => c && (c.isFree || Number(c.price) === 0)) : null;

  if (!trial && !freeCourse) {
    if (!import.meta.env.DEV) return null;
    return (
      <section className="wt-section" aria-label="Free resource placeholder">
        <div className="wt-container">
          <div className="wt-placeholder">
            <strong>Free lead magnet placeholder (only visible in development)</strong>
            <p>TODO(owner): add a free lesson in admin → Trials, or mark a course as free. It will be promoted here automatically.</p>
          </div>
        </div>
      </section>
    );
  }

  const title = trial ? trial.title : freeCourse.title;
  return (
    <section className="wt-section lp-magnet-wrap" id="free" aria-labelledby="magnet-title">
      <div className="wt-container">
        <div className="lp-magnet reveal">
          <span className="wt-icon-tile wt-icon-tile--accent lp-magnet-icon"><Icon name={trial ? 'play' : 'book'} size={28} /></span>
          <div className="lp-magnet-copy">
            <p className="wt-eyebrow">Free to start</p>
            <h2 id="magnet-title" className="wt-h3 lp-magnet-title">{trial ? `Watch a free lesson: ${title}` : `Start free: ${title}`}</h2>
            <p className="wt-muted">See how we teach before you buy anything. No payment needed.</p>
          </div>
          {trial ? (
            <a href="#trials" className="wt-btn wt-btn--primary">Watch free <Icon name="play" size={18} /></a>
          ) : (
            <Link to={`/sale/${freeCourse._id}`} className="wt-btn wt-btn--primary">Start free <Icon name="arrow-right" size={18} /></Link>
          )}
        </div>
      </div>
    </section>
  );
}
