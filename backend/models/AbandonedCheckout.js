import mongoose from 'mongoose';

const AbandonedCheckoutSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  courseTitle: {
    type: String,
    default: 'Course'
  },
  amount: {
    type: Number,
    default: 0
  },
  buyerName: {
    type: String,
    trim: true,
    default: ''
  },
  buyerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    index: true
  },
  buyerPhone: {
    type: String,
    trim: true,
    default: ''
  },
  buyerState: {
    type: String,
    default: ''
  },
  step: {
    type: String,
    enum: ['entered_checkout', 'filled_contact', 'initiated_payment', 'payment_failed'],
    default: 'entered_checkout'
  },
  status: {
    type: String,
    enum: ['abandoned', 'recovered'],
    default: 'abandoned',
    index: true
  },
  recoveredAt: {
    type: Date,
    default: null
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: false });

AbandonedCheckoutSchema.index({ buyerEmail: 1, courseId: 1 });
AbandonedCheckoutSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('AbandonedCheckout', AbandonedCheckoutSchema);
