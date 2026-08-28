import mongoose from 'mongoose';

const ChapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String, required: true }, // YouTube, Vimeo, or local video link
  driveLink: { type: String }, // Google Drive or material resources download link
  duration: { type: String } // e.g. "12:45"
});

const LanguageContentSchema = new mongoose.Schema({
  language: { type: String, required: true }, // e.g., "English", "Hindi"
  chapters: [ChapterSchema]
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // e.g., "AI Development", "AI in Daily Life"
  packageType: { type: String, enum: ['Starter', 'Professional', 'Master'], default: 'Starter' },
  price: { type: Number, required: true },
  thumbnail: { type: String }, // Image/Cover URL
  languages: [{ type: String }], // List of available languages
  content: [LanguageContentSchema], // Grouped by language
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Course', CourseSchema);
