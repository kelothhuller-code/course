import mongoose from 'mongoose';

/**
 * Funnel interaction events that are not page views (e.g. "buy" button clicks, enquiry
 * submissions). Recorded through the same first-party tracker as PageView/AbandonedCheckout
 * (POST /api/analytics/track-event) and summarised in admin → Traffic & Drop-offs.
 */
export const FUNNEL_EVENT_NAMES = ['buy_click', 'enquiry_submit', 'checkout_view', 'checkout_start', 'payment_success', 'payment_failed', 'software_download'];

const FunnelEventSchema = new mongoose.Schema({
  name: { type: String, enum: FUNNEL_EVENT_NAMES, required: true, index: true },
  path: { type: String, default: '', trim: true },
  source: { type: String, default: '', trim: true },
  sessionId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  device: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

FunnelEventSchema.index({ name: 1, createdAt: -1 });

export default mongoose.model('FunnelEvent', FunnelEventSchema);
