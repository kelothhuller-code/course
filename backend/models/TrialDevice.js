import mongoose from 'mongoose';

// One free trial per device per software product. The device id is stored only as a hash, and the
// record is kept after the trial ends, so reinstalling the app cannot start a new trial.
const TrialDeviceSchema = new mongoose.Schema({
  software: { type: mongoose.Schema.Types.ObjectId, ref: 'Software', required: true },
  appId: { type: String, required: true },
  deviceHash: { type: String, required: true },
  deviceName: { type: String, default: '' },
  appVersion: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  lastSeenAt: { type: Date, default: Date.now },
  checks: { type: Number, default: 0 },
});
TrialDeviceSchema.index({ software: 1, deviceHash: 1 }, { unique: true });

export default mongoose.model('TrialDevice', TrialDeviceSchema);
