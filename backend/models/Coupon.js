import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  // Optional: restrict coupon to specific courses. Empty means valid for all.
  applicableCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  expiryDate: {
    type: Date,
    default: null, // null = no expiry
  },
  usageLimit: {
    type: Number,
    default: null, // null = unlimited
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  usedByUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxUsesPerUser: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Coupon', CouponSchema);
