/**
 * Public site contact settings (safe to ship to the browser — no secrets here).
 *
 * WhatsApp number: set VITE_WHATSAPP_NUMBER in frontend/.env (international format,
 * digits only, e.g. 919876543210). If it is not set we fall back to the number that
 * was already hard-coded in the previous floating WhatsApp button.
 * TODO(owner): confirm this is the number you want shown publicly.
 */
const DEFAULT_WHATSAPP_NUMBER = '918281760168';

export const WHATSAPP_NUMBER = String(
  import.meta.env.VITE_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
).replace(/\D/g, '');

export const WHATSAPP_PREFILL =
  'Hi WideTech! I have a quick question about your courses/software.';

export const whatsappUrl = (message = WHATSAPP_PREFILL) =>
  WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}` : '';

// Already used on the Contact & Refund pages.
export const SUPPORT_EMAIL = 'support@widetech.in';

/**
 * Scroll to the on-page enquiry form and optionally preselect the "interest" dropdown
 * (and a specific software/service: openEnquiry('Software', { type: 'software', id })).
 */
export const openEnquiry = (interest, related) => {
  if (interest || related) {
    window.dispatchEvent(new CustomEvent('enquiry:prefill', {
      detail: { interest, relatedType: related?.type, relatedId: related?.id },
    }));
  }
  const el = document.getElementById('enquiry');
  if (el) {
    const y = el.getBoundingClientRect().top + window.pageYOffset - 70;
    window.scrollTo({ top: y, behavior: 'smooth' });
  } else {
    window.location.href = '/#enquiry';
  }
};

/** Shared helpers for course pricing so every CTA shows the same number. */
export const getCoursePrice = (course) => {
  if (!course) return null;
  const isFree = course.isFree || Number(course.price) === 0;
  if (isFree) return { isFree: true, current: 0, original: null, label: 'Free' };
  const hasDiscount = course.discountedPrice && course.discountedPrice < course.price;
  const current = hasDiscount ? course.discountedPrice : course.price;
  return {
    isFree: false,
    current,
    original: hasDiscount ? course.price : null,
    label: `₹${current}`,
  };
};

export const isEnrolledIn = (user, course) =>
  !!(user && course && user.enrolledCourses?.some(
    (c) => (c.courseId?._id || c.courseId)?.toString() === course._id?.toString()
  ));

export const countChapters = (course) => {
  if (!course || !Array.isArray(course.content)) return 0;
  const titles = new Set();
  course.content.forEach((lang) => (lang.chapters || []).forEach((ch) => ch?.title && titles.add(ch.title)));
  return titles.size;
};

/* --------------------------------------------------------------------------
 * Brand & social settings (public, no secrets). Override with frontend env vars.
 * -------------------------------------------------------------------------- */
export const SITE_NAME = 'WideTech';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://widetech.in').replace(/\/$/, '');
export const SITE_TAGLINE = 'Courses, software and services that help you learn, work smarter and grow.';

/**
 * Instagram: VITE_INSTAGRAM_HANDLE (without @) and optional VITE_INSTAGRAM_FOLLOWERS_TEXT
 * (e.g. "24K+ followers"). The follower text is only shown when you set it; it is never
 * fetched or invented. Set VITE_INSTAGRAM_HANDLE to an empty string to hide Instagram.
 */
export const INSTAGRAM_HANDLE = String(
  import.meta.env.VITE_INSTAGRAM_HANDLE ?? 'broffydiaries'
).replace(/^@/, '').trim();
export const INSTAGRAM_FOLLOWERS_TEXT = String(import.meta.env.VITE_INSTAGRAM_FOLLOWERS_TEXT || '').trim();
export const INSTAGRAM_URL = INSTAGRAM_HANDLE ? `https://www.instagram.com/${INSTAGRAM_HANDLE}/` : '';

/**
 * "Who is behind WideTech" block on the landing page. Name and location are the ones the
 * previous site already showed; set VITE_FOUNDER_NAME="" to hide the block.
 * TODO(owner): check the bio below (keep it factual: no invented numbers or awards).
 * Photo lives at frontend/public/founder.webp. Replace the file to change it.
 */
export const FOUNDER = {
  name: import.meta.env.VITE_FOUNDER_NAME ?? 'Broffy',
  role: import.meta.env.VITE_FOUNDER_ROLE || 'Founder, WideTech',
  location: import.meta.env.VITE_FOUNDER_LOCATION ?? 'Wayanad, Kerala',
  photo: '/founder.webp',
  bio:
    import.meta.env.VITE_FOUNDER_BIO ||
    'WideTech is run by a small team that builds practical courses, business software and automation services. Every course and product on this site is something we use or deliver ourselves.',
};

/** Format a rupee amount. */
export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** Human label for a software/service price, based on its pricing type. */
export const priceLabel = (item, kind = 'software') => {
  if (!item) return null;
  const type = item.pricingType || (kind === 'service' ? 'quote' : 'one_time');
  const base = kind === 'service' ? Number(item.startingPrice ?? item.price) : Number(item.price);
  const disc = Number(item.discountedPrice) > 0 && Number(item.discountedPrice) < base ? Number(item.discountedPrice) : null;
  const amount = disc ?? base;
  if (type === 'quote' || !(amount > 0)) return { main: 'Price on request', sub: kind === 'service' ? 'Tell us your needs for a quote' : 'Contact us for a quote', original: null };
  const original = disc ? formatINR(base) : null;
  switch (type) {
    case 'subscription_monthly': return { main: formatINR(amount), sub: 'per month', original };
    case 'subscription_yearly': return { main: formatINR(amount), sub: 'per year', original };
    case 'starting_from': return { main: `From ${formatINR(amount)}`, sub: kind === 'service' ? 'final price depends on scope' : 'depending on setup', original };
    case 'fixed': return { main: formatINR(amount), sub: 'fixed price', original };
    default: return { main: formatINR(amount), sub: 'one-time', original };
  }
};

export const SOFTWARE_CTA_LABEL = { buy: 'Buy now', demo: 'Request a demo', enquire: 'Enquire' };
export const SERVICE_CTA_LABEL = { book_call: 'Book a call', quote: 'Get a quote', enquire: 'Enquire' };

/**
 * Testimonials: intentionally EMPTY until you add real ones (with permission).
 * TODO(owner): add entries like { name: 'First L.', role: 'Course student', quote: '…' }.
 * Never use made-up names, quotes, ratings or counts. The block renders once this has entries.
 */
export const TESTIMONIALS = [];
