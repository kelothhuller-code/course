import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

/**
 * Problem → solution. Deliberately generic: it describes the two kinds of visitor
 * WideTech serves (learners and businesses) without any invented numbers or claims.
 */
export function ProblemSolution() {
  const rows = [
    {
      icon: 'book',
      problem: 'Courses that are long on theory and short on doing.',
      solution: 'Self-paced, practical lessons you can apply straight away, on your phone or laptop.',
    },
    {
      icon: 'clock',
      problem: 'Hours lost to spreadsheets, copy-paste and manual follow-ups.',
      solution: 'Ready-to-use software and automation that takes repetitive work off your plate.',
    },
    {
      icon: 'briefcase',
      problem: 'No time or team to build the tools your business needs.',
      solution: 'Custom software and business administration services, scoped and delivered for you.',
    },
  ];
  return (
    <section className="wt-section wt-section--white" id="why" aria-labelledby="why-title">
      <div className="wt-container">
        <div className="wt-section-head reveal">
          <p className="wt-eyebrow">Why WideTech</p>
          <h2 id="why-title" className="wt-h2">Less busywork. More progress.</h2>
          <p className="wt-lead">Whether you are learning a new skill or running a business, we help you get the practical part done.</p>
        </div>
        <ul className="lp-ps">
          {rows.map((r, i) => (
            <li key={r.problem} className="lp-ps-row reveal" style={{ '--reveal-delay': `${i * 80}ms` }}>
              <span className="wt-icon-tile"><Icon name={r.icon} size={22} /></span>
              <p className="lp-ps-problem"><span className="sr-only">Problem: </span>{r.problem}</p>
              <Icon name="arrow-right" size={20} className="lp-ps-arrow" />
              <p className="lp-ps-solution"><span className="sr-only">How we help: </span>{r.solution}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "What you get": the three things WideTech offers, each linking to its catalogue. */
export function Offerings({ courseTotal = 0, softwareCount = 0, serviceCount = 0 }) {
  const items = [
    { icon: 'book', tone: '', title: 'Online courses', text: 'Self-paced courses on practical topics with instant, lifetime access and a GST invoice.', to: '/all-courses', cta: 'Browse courses', count: courseTotal },
    { icon: 'grid', tone: 'accent', title: 'Business software', text: 'Ready-to-use tools for business administration and everyday operations. See prices, download and buy online.', to: '/software', cta: 'See software', count: softwareCount },
    { icon: 'automation', tone: 'warm', title: 'Services', text: 'Automation, custom software and business administration, done for you from first call to hand-over.', to: '/services', cta: 'See services', count: serviceCount },
  ];
  return (
    <section className="wt-section" id="offer" aria-labelledby="offer-title">
      <div className="wt-container">
        <div className="wt-section-head reveal">
          <p className="wt-eyebrow">What you get</p>
          <h2 id="offer-title" className="wt-h2">One place to learn, equip and grow</h2>
        </div>
        <div className="wt-grid wt-grid--3">
          {items.map((it, i) => (
            <article key={it.title} className="wt-card wt-card--interactive reveal" style={{ '--reveal-delay': `${i * 80}ms` }}>
              <span className={`wt-icon-tile ${it.tone ? `wt-icon-tile--${it.tone}` : ''}`}><Icon name={it.icon} size={24} /></span>
              <h3 className="wt-card__title lp-offer-title"><Link to={it.to}>{it.title}</Link></h3>
              <p className="wt-card__text">{it.text}</p>
              <div className="wt-card__foot">
                <span className="wt-link">{it.cta} <Icon name="arrow-right" size={16} /></span>
                {it.count > 0 && <span className="wt-badge wt-badge--neutral">{it.count} available</span>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
