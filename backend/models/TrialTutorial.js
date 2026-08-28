import mongoose from 'mongoose';

const TrialTutorialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String, required: true },
  category: { type: String }, // e.g. "AI Development", "Daily AI Tools"
  duration: { type: String }, // e.g. "5 mins"
  thumbnail: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('TrialTutorial', TrialTutorialSchema);
