import React from 'react';

/**
 * Social proof section — intentionally EMPTY until the owner adds real quotes.
 *
 * TODO(owner): add genuine testimonials from real students/customers (with their
 * permission) below. Never use made-up names, quotes, ratings or student counts.
 * Example entry:
 *   { name: 'First L.', role: 'Class 9 student, Kochi', quote: 'What they said…' },
 * The section renders automatically once this array has at least one entry.
 */
const TESTIMONIALS = [];

export default function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="testimonials-section" id="testimonials" aria-labelledby="testimonials-title">
      <div className="container">
        <div className="section-label">STUDENT STORIES</div>
        <h2 className="section-title" id="testimonials-title">What Learners Say</h2>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name + t.quote.slice(0, 12)} className="testimonial-card">
              <blockquote>“{t.quote}”</blockquote>
              <figcaption>
                <strong>{t.name}</strong>
                {t.role && <span> · {t.role}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
