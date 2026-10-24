import Icon from '../../components/Icon';

/** Three steps that describe the real flow for both courses and business products. */
export default function HowItWorks() {
  const steps = [
    { icon: 'search', title: 'Choose', desc: 'Browse courses, software and services. Every page shows the price, or that it is quoted.' },
    { icon: 'lock', title: 'Buy or enquire', desc: 'Courses: pay securely with Razorpay (UPI, cards, net banking). Software and services: send a short enquiry.' },
    { icon: 'rocket', title: 'Get going', desc: 'Course access is instant from your dashboard. For software and services we reply by email with next steps.' },
  ];
  return (
    <section className="wt-section wt-section--white" id="how-it-works" aria-labelledby="how-title">
      <div className="wt-container">
        <div className="wt-section-head reveal">
          <p className="wt-eyebrow">How it works</p>
          <h2 id="how-title" className="wt-h2">Three simple steps</h2>
        </div>
        <ol className="lp-steps">
          {steps.map((s, i) => (
            <li key={s.title} className="lp-step reveal" style={{ '--reveal-delay': `${i * 90}ms` }}>
              <span className="lp-step-num" aria-hidden="true">{i + 1}</span>
              <span className="wt-icon-tile"><Icon name={s.icon} size={22} /></span>
              <h3 className="wt-h3">{s.title}</h3>
              <p className="wt-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
