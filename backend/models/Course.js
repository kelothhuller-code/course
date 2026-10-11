import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'notes', 'slides', 'sheet', 'image', 'document', 'other'], default: 'other' },
  title: { type: String },
  link: { type: String, required: true } // Drive link or server file URL
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
  isFeatured: { type: Boolean, default: false },
  outcomes: [{ type: String }], // Deliverables / Benefits
  packageType: { type: String, enum: ['Starter', 'Professional', 'Master'], default: 'Starter' },
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  affiliateCommission: { type: Number, default: 0 },
  thumbnail: { type: String }, // Image/Cover URL
  languages: [{ type: String }], // List of available languages
  content: [LanguageContentSchema], // Grouped by language
  continuationCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  salesPageConfig: {
    slug: { type: String, sparse: true, unique: true },
    headline: { type: String },
    subheadline: { type: String },
    promoVideoUrl: { type: String },
    badgeText: { type: String },
    ctaText: { type: String, default: 'Enroll Now' },
    highlights: [{ type: String }],
    targetAudience: [{ type: String }],
    faqs: [{
      question: { type: String },
      answer: { type: String }
    }],
    testimonials: [{
      name: { type: String },
      role: { type: String },
      text: { type: String },
      rating: { type: Number, default: 5 },
      avatar: { type: String }
    }]
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Course', CourseSchema);
