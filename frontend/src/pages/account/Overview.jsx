import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, Pill, ProgressBar } from './ui';
import { daysUntil, fmtDate, inr, useAsync } from './format';
import { licenceStatus } from './MySoftware.helpers';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const settled = async (p, fallback) => { try { return await p; } catch { return fallback; } };

export default function Overview({ user }) {
  const { loading, data } = useAsync(async () => {
    const [learning, lic, orders, invoices] = await Promise.all([
      settled(api.getMyLearning(), { courses: [] }),
      settled(api.getMyLicenses(), { licenses: [] }),
      settled(api.getMyServiceOrders(), { orders: [] }),
      settled(api.getMyInvoices({ page: 1, limit: 5 }), { transactions: [] }),
    ]);
    return { learning, licenses: lic.licenses || [], serviceOrders: orders.orders || [], invoices: invoices.transactions || [] };
  });

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'there';
  const courses = data?.learning?.courses || [];
  const inProgress = courses
    .filter((c) => c.course && !c.completed)
    .sort((a, b) => new Date(b.lastWatchedAt || b.enrolledAt || 0) - new Date(a.lastWatchedAt || a.enrolledAt || 0));
  const resume = inProgress[0] || courses.find((c) => c.course);
  const activeLicences = (data?.licenses || []).filter((l) => licenceStatus(l).tone === 'success' || licenceStatus(l).tone === 'warning');
  const openOrders = (data?.serviceOrders || []).filter((o) => o.status !== 'closed' && o.status !== 'delivered');

  const stats = [
    { label: 'Courses', value: courses.length, icon: 'book', to: '/dashboard/courses' },
    { label: 'Completed', value: courses.filter((c) => c.completed).length, icon: 'award', to: '/dashboard/certificates' },
    { label: 'Active licences', value: activeLicences.length, icon: 'key', to: '/dashboard/software' },
    { label: 'Open service orders', value: openOrders.length, icon: 'briefcase', to: '/dashboard/services' },
  ];

  return (
    <div className="acc-stack">
      <section className="acc-hero" aria-labelledby="acc-hello">
        <div>
          <p className="acc-hero__eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 id="acc-hello">{greeting()}, {firstName}</h1>
          <p className="acc-hero__sub">Everything you have with WideTech, in one place.</p>
        </div>
        <div className="acc-quick" role="group" aria-label="Quick actions">
          <Link to="/all-courses" className="acc-quick__btn"><Icon name="search" size={18} />Browse courses</Link>
          <Link to="/software" className="acc-quick__btn"><Icon name="code" size={18} />Get software</Link>
          <Link to="/services" className="acc-quick__btn"><Icon name="briefcase" size={18} />Book a service</Link>
          <Link to="/dashboard/help" className="acc-quick__btn"><Icon name="help-circle" size={18} />Get help</Link>
        </div>
      </section>

      <section className="acc-stats" aria-label="Summary">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="acc-stat">
            <span className="acc-stat__icon" aria-hidden="true"><Icon name={s.icon} size={20} /></span>
            <span className="acc-stat__value">{loading ? <span className="wt-skeleton" style={{ display: 'inline-block', width: 28, height: 24 }} /> : s.value}</span>
            <span className="acc-stat__label">{s.label}</span>
          </Link>
        ))}
      </section>

      <div className="acc-grid-2">
        <section className="acc-card acc-continue" aria-labelledby="acc-continue-h">
          <div className="acc-card__head"><h2 id="acc-continue-h">Continue learning</h2><Link to="/dashboard/courses" className="acc-link">All courses</Link></div>
          {loading ? (
            <div className="acc-continue__body"><div className="wt-skeleton acc-continue__thumb" /><div style={{ flex: 1 }}><div className="wt-skeleton wt-skeleton--title" /><div className="wt-skeleton wt-skeleton--text" /></div></div>
          ) : resume ? (
            <div className="acc-continue__body">
              <img className="acc-continue__thumb" src={resume.course.thumbnail || '/placeholders/course.svg'} alt="" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholders/course.svg'; }} />
              <div className="acc-continue__info">
                <h3>{resume.course.title}</h3>
                {resume.lastWatchedLesson ? <p className="acc-muted">Next up: {resume.lastWatchedLesson.title}</p> : <p className="acc-muted">{resume.completed ? 'Completed — revisit any lesson' : resume.progress > 0 ? 'Continue where you left off' : 'Start your first lesson'}</p>}
                <ProgressBar value={resume.progress} label={`${resume.course.title} progress`} />
                <Link to={`/course/${resume.course._id}`} className="wt-btn wt-btn--primary wt-btn--sm"><Icon name="play" size={16} />{resume.progress > 0 && !resume.completed ? 'Resume' : resume.completed ? 'Review' : 'Start'}</Link>
              </div>
            </div>
          ) : (
            <EmptyState icon="book" title="No courses yet" text="Pick a course and it will show up here with your progress." cta="Browse courses" ctaTo="/all-courses" />
          )}
        </section>

        <section className="acc-card" aria-labelledby="acc-lic-h">
          <div className="acc-card__head"><h2 id="acc-lic-h">Active licences</h2><Link to="/dashboard/software" className="acc-link">Manage</Link></div>
          {loading ? <div className="wt-skeleton" style={{ height: 96 }} /> : activeLicences.length ? (
            <ul className="acc-list">
              {activeLicences.slice(0, 3).map((l) => {
                const st = licenceStatus(l);
                const d = daysUntil(l.expiresAt);
                return (
                  <li key={l._id} className="acc-list__row">
                    <span className="acc-list__icon" aria-hidden="true"><Icon name="key" size={18} /></span>
                    <div className="acc-list__main"><strong>{l.software?.title}</strong><span className="acc-muted">{l.planName}{l.lifetime ? (/lifetime/i.test(l.planName || '') ? '' : ' · Lifetime') : d !== null ? ` · ${d > 0 ? `${d} day${d === 1 ? '' : 's'} left` : 'expires today'}` : ''}</span></div>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="key" title="No active licences" text="Software you buy appears here with its key, devices and downloads." cta="See software" ctaTo="/software" />
          )}
        </section>
      </div>

      <section className="acc-card" aria-labelledby="acc-orders-h">
        <div className="acc-card__head"><h2 id="acc-orders-h">Recent orders</h2><Link to="/dashboard/orders" className="acc-link">Orders & invoices</Link></div>
        {loading ? <div className="wt-skeleton" style={{ height: 120 }} /> : data?.invoices?.length ? (
          <ul className="acc-list">
            {data.invoices.slice(0, 5).map((t) => (
              <li key={t._id || t.txnid} className="acc-list__row">
                <span className="acc-list__icon" aria-hidden="true"><Icon name={t.itemType === 'software' ? 'key' : t.itemType === 'service' ? 'briefcase' : 'book'} size={18} /></span>
                <div className="acc-list__main"><strong>{t.itemTitle || t.courseId?.title || 'Order'}</strong><span className="acc-muted">{fmtDate(t.createdAt)} · {inr(t.amount)}</span></div>
                <Pill tone={t.status === 'success' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}>{t.status === 'success' ? 'Paid' : t.status === 'failed' ? 'Failed' : 'Pending'}</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="receipt" title="No orders yet" text="Your purchases and GST invoices will be listed here." cta="Explore courses" ctaTo="/all-courses" />
        )}
      </section>
    </div>
  );
}
