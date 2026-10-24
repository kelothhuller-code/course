import Icon from '../../components/Icon';
import InstagramCard from '../../components/InstagramCard';
import { FOUNDER, TESTIMONIALS } from '../../config/site';

/**
 * Proof: who is behind WideTech, where to follow us, and (once added) real testimonials.
 * No invented numbers, logos or quotes. See FOUNDER / TESTIMONIALS in src/config/site.js.
 */
export default function ProofSection() {
  const hasFounder = Boolean(FOUNDER.name);
  return (
    <section className="wt-section" id="about" aria-labelledby="proof-title">
      <div className="wt-container">
        <div className="wt-section-head reveal">
          <p className="wt-eyebrow">Who we are</p>
          <h2 id="proof-title" className="wt-h2">Real people behind every course and project</h2>
        </div>

        <div className="lp-proof">
          {hasFounder && (
            <figure className="wt-card lp-founder reveal">
              <img src={FOUNDER.photo} alt={`${FOUNDER.name}, ${FOUNDER.role}`} width="112" height="112" loading="lazy" decoding="async" className="lp-founder-photo" />
              <figcaption>
                <p className="lp-founder-name">{FOUNDER.name}</p>
                <p className="wt-muted">{FOUNDER.role}</p>
                {FOUNDER.location && <p className="lp-founder-loc"><Icon name="globe" size={16} /> {FOUNDER.location}</p>}
              </figcaption>
              <blockquote className="lp-founder-bio">{FOUNDER.bio}</blockquote>
            </figure>
          )}
          <div className="lp-proof-side reveal" style={{ '--reveal-delay': '100ms' }}>
            <InstagramCard />
            {TESTIMONIALS.length > 0 ? (
              <div className="lp-quotes">
                {TESTIMONIALS.map((t) => (
                  <figure key={t.name + t.quote.slice(0, 12)} className="wt-card lp-quote">
                    <blockquote>“{t.quote}”</blockquote>
                    <figcaption><strong>{t.name}</strong>{t.role && <span> · {t.role}</span>}</figcaption>
                  </figure>
                ))}
              </div>
            ) : import.meta.env.DEV ? (
              <div className="wt-placeholder">
                <strong>Testimonials placeholder (only visible in development)</strong>
                <p>TODO(owner): add real testimonials to <code>TESTIMONIALS</code> in <code>frontend/src/config/site.js</code>.</p>
              </div>
            ) : null}
            <ul className="lp-facts">
              <li><Icon name="shield" size={18} /> Secure payments via Razorpay, with GST invoices</li>
              <li><Icon name="mail" size={18} /> Every enquiry is read and answered by our team</li>
              <li><Icon name="document" size={18} /> Clear terms, privacy and refund policies</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
