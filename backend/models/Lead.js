import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
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
    default: 'landing_page', // e.g., 'landing_page', 'course_preview', 'exit_intent'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Lead', LeadSchema);
