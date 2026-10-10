import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    default: '',
  },
  source: {
    type: String,
    default: 'landing_page',
  },
  isSubscribed: {
    type: Boolean,
    default: true,
  },
  welcomeEmailSent: {
    type: Boolean,
    default: false,
  },
  welcomeEmailSentAt: {
    type: Date,
    default: null,
  },
  unsubscribedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Lead', LeadSchema);
