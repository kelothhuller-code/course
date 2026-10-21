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
  status: {
    type: String,
    enum: ['unread', 'replied', 'closed'],
    default: 'unread',
  },
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
