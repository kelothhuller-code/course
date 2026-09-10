import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'notes', 'slides', 'other'], required: true },
  title: { type: String },
  link: { type: String, required: true } // Drive link
});

const ChapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String }, // Made optional for backward compatibility
  driveLink: { type: String }, // Made optional
  duration: { type: String }, // e.g. "12:45"
  materials: [MaterialSchema] // New field for flexible drive links
});

const LanguageContentSchema = new mongoose.Schema({
  language: { type: String, required: true }, // e.g., "English", "Hindi"
  chapters: [ChapterSchema]
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // e.g., "AI Development", "AI in Daily Life"
  isFree: { type: Boolean, default: false },
  outcomes: [{ type: String }], // Deliverables / Benefits
  packageType: { type: String, enum: ['Starter', 'Professional', 'Master'], default: 'Starter' },
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  affiliateCommission: { type: Number, default: 0 },
  thumbnail: { type: String }, // Image/Cover URL
  languages: [{ type: String }], // List of available languages
  content: [LanguageContentSchema], // Grouped by language
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Course', CourseSchema);
