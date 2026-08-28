import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
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
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
