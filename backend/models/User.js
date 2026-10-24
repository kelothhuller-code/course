import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  walletBalance: { type: Number, default: 0 },
  enrolledCourses: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    progress: { type: Number, default: 0 }, // 0 to 100 %
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedChapters: [{ type: String }] // List of completed chapter titles
  }],
  enrolledEvents: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    enrolledAt: { type: Date, default: Date.now }
  }],
  purchasedSoftware: [{
    softwareId: { type: mongoose.Schema.Types.ObjectId, ref: 'Software' },
    purchasedAt: { type: Date, default: Date.now },
    licenseKey: { type: String },
    status: { type: String, default: 'active' },
    requirements: { type: String },
    contactPhone: { type: String }
  }],
  purchasedServices: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    enquiredAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['enquired', 'in_scoping', 'in_progress', 'completed', 'active'], default: 'enquired' },
    requirements: { type: String },
    contactPhone: { type: String }
  }],
  // Billing profile (optional). Pre-fills checkout and the GST invoice.
  phone: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  gstin: { type: String, trim: true, uppercase: true, default: '' },
  businessName: { type: String, trim: true, default: '' },
  billingAddress: { type: String, trim: true, default: '' },
  passwordChangedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  certificates: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    certificateId: {
      type: String,
      sparse: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    courseTitle: String,
    completionDate: Date,
    certificateUrl: String
  }],
  tokenVersion: {
    type: Number,
    default: 0
  },
  forgotPasswordOTP: {
    type: String,
    sparse: true
  },
  forgotPasswordExpires: {
    type: Date
  },
  forgotPasswordAttempts: {
    type: Number,
    default: 0
  },
  forgotRequestCount: {
    type: Number,
    default: 0
  },
  forgotRequestWindow: {
    type: Date
  },
  lastForgotAttempt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.forgotPasswordOTP;
      delete ret.forgotPasswordExpires;
      delete ret.forgotPasswordAttempts;
      delete ret.forgotRequestCount;
      delete ret.forgotRequestWindow;
      delete ret.lastForgotAttempt;
      delete ret.tokenVersion;
      return ret;
    }
  }
});


export default mongoose.model('User', UserSchema);
