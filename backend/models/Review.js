import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  headline: {
    type: String,
    trim: true,
    maxlength: 120
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  approved: {
    type: Boolean,
    default: true
  },
  adminReply: {
    text: { type: String, trim: true, maxlength: 2000 },
    repliedAt: { type: Date }
  }
}, {
  timestamps: true
});

ReviewSchema.index({ courseId: 1, approved: 1, createdAt: -1 });

export default mongoose.model('Review', ReviewSchema);
