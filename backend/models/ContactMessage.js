import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  subject: {
    type: String,
    trim: true,
    default: 'General Inquiry',
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  // Optional contact phone (not required — the owner prefers email replies)
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  // What the visitor is interested in (used to triage course vs software enquiries)
  interest: {
    type: String,
    enum: ['Course', 'Software', 'Service', 'Other'],
    default: 'Other',
  },
  // Where the enquiry came from (landing_page, contact_page, software_modal, service_modal)
  source: {
    type: String,
    trim: true,
    default: '',
  },
  // Pipeline status. Legacy values "unread"/"replied" are treated as new/contacted in the admin.
  status: {
    type: String,
    enum: ['unread', 'replied', 'closed', 'new', 'contacted', 'qualified'],
    default: 'new',
  },
  // ---- Smart business enquiry (multi-step form) ----
  category: { type: String, trim: true, default: '' },       // EnquiryCategory.key, e.g. "coffee"
  categoryLabel: { type: String, trim: true, default: '' },
  answers: [{
    key: { type: String },
    label: { type: String },
    value: { type: String },
    _id: false,
  }],
  score: { type: Number, default: 0 },
  priority: { type: String, enum: ['high', 'medium', 'low', ''], default: '' },
  company: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: '' },
  // Product the enquiry is about (software/service/course detail pages)
  relatedType: { type: String, enum: ['course', 'software', 'service', ''], default: '' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  relatedTitle: { type: String, trim: true, default: '' },
  replyMessage: {
    type: String,
    default: '',
  },
  repliedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('ContactMessage', ContactMessageSchema);
