import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['webinar', 'workshop'], required: true },
  isPaid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  dateTime: { type: Date, required: true },
  meetingLink: { type: String, required: true }, // Hidden until purchased / registered
  meetingType: { type: String, enum: ['jitsi', 'embed_youtube', 'external'], default: 'jitsi' },
  meetingPasscode: { type: String, default: '' },
  streamUrl: { type: String, default: '' }, // For YouTube live / Twitch embed
  attendeeLimit: { type: Number, default: 0 }, // 0 = unlimited
  targetAudience: [{ type: String }],
  outcomes: [{ type: String }],
  duration: { type: String }, // e.g. "1.5 Hours"
  thumbnail: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Event', EventSchema);
