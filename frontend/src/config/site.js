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

/** Scroll to the enquiry form and optionally preselect the "interest" dropdown. */
export const openEnquiry = (interest) => {
  if (interest) {
    window.dispatchEvent(new CustomEvent('enquiry:prefill', { detail: { interest } }));
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
