/**
 * Buyer FAQs shown on the landing page and (as a fallback) on course sales pages.
 * Every answer here is based on behaviour that already exists in the codebase
 * (checkout, GST invoices, certificates, refund policy). Update them if the
 * business rules change.
 */
export const BUYING_FAQS = [
  {
    q: 'Do I need coding experience?',
    a: 'No. The beginner curriculum starts from the absolute basics — no prior coding knowledge is required.',
  },
  {
    q: 'How do I pay, and is GST included?',
    a: 'Checkout is handled securely by Razorpay (UPI, cards and other methods Razorpay supports). Listed prices already include 18% GST, and a GST invoice is emailed to you automatically.',
  },
  {
    q: 'Do I need an account before buying?',
    a: 'No. Just enter your name, email and phone at checkout. If you are new, an account is created for you and your login details are emailed to you.',
  },
  {
    q: 'How do I access the course after payment?',
    a: 'Access is instant. After payment you are taken straight to the course, and it is always available in your student dashboard.',
  },
  {
    q: 'Is this a live course? How long do I have access?',
    a: 'Courses are pre-recorded video lessons you can watch at your own pace, with lifetime access. Live hands-on workshops are offered separately with their own schedules.',
  },
  {
    q: 'Can I watch the lessons on my phone?',
    a: 'Yes. The course platform works on mobile phones, tablets and desktop computers.',
  },
  {
    q: 'Do I get a certificate?',
    a: 'Yes. You receive a verifiable digital certificate when you complete 100% of the course.',
  },
  {
    q: 'What age is this for?',
    a: '10+ and anyone who wants to learn. No advanced maths is needed.',
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
