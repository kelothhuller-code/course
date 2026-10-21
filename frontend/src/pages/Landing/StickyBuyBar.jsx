import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCoursePrice, isEnrolledIn } from '../../config/site';

/**
 * Mobile-only sticky "buy" bar for the featured course. Appears after the visitor
 * scrolls past the hero so the purchase CTA is always one tap away.
 */
export default function StickyBuyBar({ course, user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 650);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!course || isEnrolledIn(user, course)) return null;
  const price = getCoursePrice(course);

  return (
    <div className={`landing-sticky-buy ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <div className="landing-sticky-info">
        <span className="landing-sticky-title">{course.title}</span>
        <span className="landing-sticky-price">
          {price.label}
          {price.original && <s>₹{price.original}</s>}
          {!price.isFree && <small> incl. GST</small>}
        </span>
      </div>
      <Link to={`/sale/${course._id}`} className="btn btn-primary landing-sticky-cta" tabIndex={visible ? 0 : -1}>
        {price.isFree ? 'Start Free' : 'Buy Now'}
      </Link>
    </div>
  );
}
