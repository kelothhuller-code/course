/**
 * Default categories + follow-up questions for the smart business enquiry form.
 * They are copied into the database (EnquiryCategory collection) the first time the
 * form is requested and from then on are edited in Admin → Enquiry Form.
 *
 * Option "score" values feed a simple lead score (sum of chosen options):
 *   score >= 6 → high priority, >= 3 → medium, otherwise low.
 * Scores are only a triage hint for the owner and are never shown to visitors.
 */
const o = (label, score = 0) => ({ label, score });
const q = (key, label, type, extra = {}) => ({ key, label, type, required: false, options: [], ...extra });

const TIMELINE = [o('As soon as possible', 3), o('Within 1 month', 2), o('1–3 months', 1), o('Just exploring', 0)];
const BUDGET = [o('Under ₹25,000', 0), o('₹25,000 – ₹1 lakh', 1), o('₹1 – 5 lakh', 2), o('Above ₹5 lakh', 3), o('Not sure yet', 0)];
const TEAM = [o('Just me', 0), o('2–10', 1), o('11–50', 2), o('51+', 3)];

export const DEFAULT_ENQUIRY_CATEGORIES = [
  {
    key: 'coffee', label: 'Coffee', icon: 'coffee', order: 1,
    description: 'Buying or selling coffee (green or roasted).',
    questions: [
      q('role', 'Are you buying or selling?', 'select', { required: true, options: [o('Buyer', 2), o('Seller', 1)] }),
      q('coffee_type', 'Coffee type', 'multiselect', { required: true, options: [o('Arabica'), o('Robusta'), o('Specialty', 1)] }),
      q('form', 'Green or roasted?', 'select', { options: [o('Green (unroasted)'), o('Roasted'), o('Either')] }),
      q('quantity', 'Approximate quantity', 'select', { required: true, options: [o('Under 100 kg', 0), o('100 kg – 1 tonne', 1), o('1 – 20 tonnes', 2), o('More than 20 tonnes (container)', 3)] }),
      q('frequency', 'How often?', 'select', { options: [o('One-time', 0), o('Monthly', 2), o('Quarterly', 1), o('Seasonal', 1)] }),
      q('destination', 'Destination country', 'text', { placeholder: 'e.g. UAE' }),
      q('timeline', 'Timeline', 'select', { options: TIMELINE }),
      q('samples', 'Do you need samples?', 'select', { options: [o('Yes', 1), o('No')] }),
    ],
  },
  {
    key: 'export', label: 'Export knowledge / training', icon: 'globe', order: 2,
    description: 'Learn exporting or get 1:1 guidance.',
    questions: [
      q('stage', 'Where are you today?', 'select', { required: true, options: [o('Complete beginner', 0), o('I have a product', 1), o('Already exporting', 2)] }),
      q('product_category', 'Product category', 'text', { placeholder: 'e.g. spices, garments' }),
      q('markets', 'Target markets', 'text', { placeholder: 'e.g. GCC, Europe' }),
      q('format', 'What would help most?', 'select', { required: true, options: [o('A course', 1), o('1:1 consulting', 2), o('Not sure', 0)] }),
      q('budget', 'Budget', 'select', { options: BUDGET }),
    ],
  },
  {
    key: 'ai', label: 'AI (solutions or learning)', icon: 'spark', order: 3,
    description: 'Learn AI or get an AI solution for your business.',
    questions: [
      q('goal', 'What do you want?', 'select', { required: true, options: [o('Learn AI', 1), o('A business solution', 2)] }),
      q('use_case', 'Describe your use case', 'textarea', { required: true, placeholder: 'What should AI help with?' }),
      q('company_size', 'Company size', 'select', { options: TEAM }),
      q('timeline', 'Timeline', 'select', { options: TIMELINE }),
      q('budget', 'Budget', 'select', { options: BUDGET }),
    ],
  },
  {
    key: 'investment', label: 'Investment opportunity', icon: 'chart', order: 4,
    description: 'Discuss investing or partnering.',
    questions: [
      q('investor_type', 'Investor type', 'select', { required: true, options: [o('Individual', 1), o('Company / fund', 2)] }),
      q('ticket_size', 'Ticket size', 'select', { required: true, options: [o('Under ₹5 lakh', 0), o('₹5 – 25 lakh', 1), o('₹25 lakh – 1 crore', 2), o('Above ₹1 crore', 3)] }),
      q('sector', 'Sector interest', 'multiselect', { options: [o('Coffee'), o('Export / trading'), o('Education'), o('Software'), o('Other')] }),
      q('timeline', 'Timeline', 'select', { options: TIMELINE }),
      q('invested_before', 'Have you invested before?', 'select', { options: [o('Yes', 1), o('No')] }),
    ],
  },
  {
    key: 'software', label: 'Software', icon: 'code', order: 5,
    description: 'One of our software products.',
    questions: [
      q('product', 'Which product?', 'catalog', { catalogSource: 'software' }),
      q('company', 'Company name', 'text'),
      q('team_size', 'Team size', 'select', { options: TEAM }),
      q('problem', 'What problem should it solve?', 'textarea', { required: true }),
      q('timeline', 'Timeline', 'select', { options: TIMELINE }),
      q('budget', 'Budget', 'select', { options: BUDGET }),
    ],
  },
  {
    key: 'services', label: 'Services', icon: 'briefcase', order: 6,
    description: 'Business administration, automation or custom software.',
    questions: [
      q('service', 'Which service?', 'catalog', { catalogSource: 'service' }),
      q('company', 'Company name', 'text'),
      q('team_size', 'Team size', 'select', { options: TEAM }),
      q('problem', 'Describe what you need', 'textarea', { required: true }),
      q('timeline', 'Timeline', 'select', { options: TIMELINE }),
      q('budget', 'Budget', 'select', { options: BUDGET }),
    ],
  },
  {
    key: 'other', label: 'Other', icon: 'chat', order: 7,
    description: 'Anything else.',
    questions: [
      q('details', 'How can we help?', 'textarea', { required: true }),
    ],
  },
].map((c) => ({ ...c, isActive: true, questions: c.questions.map((qq, i) => ({ ...qq, order: i + 1 })) }));

export const priorityForScore = (score) => (score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low');
