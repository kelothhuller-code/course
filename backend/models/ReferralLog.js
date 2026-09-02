import mongoose from 'mongoose';

const ReferralLogSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  commissionAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ReferralLog', ReferralLogSchema);
