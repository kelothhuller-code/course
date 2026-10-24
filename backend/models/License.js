import mongoose from 'mongoose';

// One device bound to a licence. Only a hash of the device id is stored.
const DeviceSchema = new mongoose.Schema({
  deviceHash: { type: String, required: true },
  deviceName: { type: String, default: '' },
  appVersion: { type: String, default: '' },
  activatedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { _id: false });

const LicenseSchema = new mongoose.Schema({
  software: { type: mongoose.Schema.Types.ObjectId, ref: 'Software', required: true, index: true },
  appId: { type: String, required: true },
  softwareTitle: { type: String, default: '' },
  planId: { type: mongoose.Schema.Types.ObjectId },
  planName: { type: String, default: '' },
  billing: { type: String, default: 'lifetime' },
  customDays: { type: Number },
  // The key itself is never stored in plain text: keyHash (SHA-256) is used for lookups,
  // keyEnc (AES-256-GCM with LICENSE_KEY_SECRET) lets the buyer see it again in the dashboard.
  keyHash: { type: String, required: true, unique: true },
  keyEnc: { type: String, required: true },
  keyLast: { type: String, default: '' }, // last group, for support ("ends with 7KQ2D")
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  buyerName: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  source: { type: String, enum: ['purchase', 'manual'], default: 'purchase' },
  expiresAt: { type: Date, default: null }, // null = lifetime
  maxDevices: { type: Number, default: 1, min: 1, max: 1000 },
  devices: [DeviceSchema],
  revoked: { type: Boolean, default: false },
  revokedReason: { type: String, default: '' },
  notes: { type: String, default: '' },
  lastValidatedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('License', LicenseSchema);
