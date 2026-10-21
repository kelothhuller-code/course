import mongoose from 'mongoose';

const PageViewSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  pageTitle: {
    type: String,
    default: ''
  },
  referrer: {
    type: String,
    default: ''
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  device: {
    type: String,
    enum: ['mobile', 'tablet', 'desktop', 'unknown'],
    default: 'unknown'
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: false });

// Optimize aggregations
PageViewSchema.index({ createdAt: -1, path: 1 });
PageViewSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model('PageView', PageViewSchema);
