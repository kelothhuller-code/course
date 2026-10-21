/**
 * Buyer FAQs shown on the landing page and (as a fallback) on course sales pages.
 *
 * Kept universal on purpose: every answer describes how the platform works for ANY course
 * (checkout, GST, access, refunds) — nothing is specific to one course's topic.
 * Course-specific questions belong in the course's own Sales Page FAQs (admin → Sales Page
 * Builder); buildBuyingFaqs() puts those first when they exist.
 */
export const BUYING_FAQS = [
  {
    q: 'How do I pay, and is GST included?',
    a: 'Checkout is handled securely by Razorpay (UPI, cards, net banking and the other methods Razorpay supports). The price you see already includes 18% GST — there is nothing extra to pay at checkout — and a GST invoice is emailed to you automatically.',
  },
  {
    q: 'Do I need an account before buying?',
    a: 'No. Just enter your name, email and phone at checkout. If you are new, an account is created for you and your login details are emailed to you.',
  },
  {
    q: 'How do I access the course after payment?',
    a: 'Access is instant. After payment you are taken straight to the course, and it stays available in your student dashboard.',
  },
  {
    q: 'How long do I have access? Is it self-paced?',
    a: 'Yes — courses are self-paced with lifetime access, so you can go through the material whenever it suits you. Live workshops, when offered, are listed separately with their own schedules.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. The course platform works on mobile phones, tablets and desktop computers.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Courses are digital and delivered instantly, so sales are final. Refunds are made for duplicate payments, platform-side technical failures we cannot fix, or workshops we cancel.',
    link: { to: '/refund', label: 'Read the full refund policy' },
  },
  {
    q: 'Do you also build software or bots for businesses?',
    a: 'Yes. WideTech offers ready-to-run software and custom bot/automation engineering. Tell us what you need using the enquiry form and we will reply by email.',
  },
];

/**
 * FAQ list for a specific course: the owner's own sales-page FAQs first, then facts derived
 * from the course data (language, format), then the universal buying FAQs.
 */
export function buildBuyingFaqs(course, { hasFreeLesson = false } = {}) {
  const own = (course?.salesPageConfig?.faqs || [])
    .filter((f) => f && f.question && f.answer)
    .map((f) => ({ q: f.question, a: f.answer }));

  const derived = [];
  const langs = (course?.languages || []).filter(Boolean);
  if (langs.length) {
    derived.push({
      q: 'Which language is the course in?',
      a: `${course.title} is available in ${langs.join(', ')}.`,
    });
  }
  if (hasFreeLesson) {
    derived.push({
      q: 'Can I try something for free first?',
      a: 'Yes — there is a free lesson on this page. Watch it first and buy the full course when you are ready.',
    });
  }

  const seen = new Set(own.map((f) => f.q.trim().toLowerCase()));
  return [...own, ...derived, ...BUYING_FAQS].filter((f) => {
    const key = f.q.trim().toLowerCase();
    if (seen.has(key) && !own.includes(f)) return false;
    seen.add(key);
    return true;
  });
}
