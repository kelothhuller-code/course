import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'notes', 'slides', 'sheet', 'image', 'document', 'zip', 'code', 'archive', 'other'], default: 'other' },
  title: { type: String },
  link: { type: String, required: true }, // Drive link or server file URL
  fileSize: { type: String }
});

const ResourceBundleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fileType: { type: String, enum: ['zip', 'pdf', 'sheet', 'notes', 'slides', 'code', 'archive', 'document', 'other'], default: 'zip' },
  fileUrl: { type: String, required: true }, // Server upload path or external download link
  fileSize: { type: String }, // e.g. "45 MB"
  isFreePreview: { type: Boolean, default: false }, // Allow download without login/enrollment
  createdAt: { type: Date, default: Date.now }
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
  // Optional landing-page course carousel position: 1 = first slot after the featured course,
  // 2 = next, ... ; null/unset = automatic (by sales, then newest); -1 = never show in the carousel.
  landingOrder: { type: Number, default: null, min: -1, max: 99 },
  outcomes: [{ type: String }], // Deliverables / Benefits
  packageType: { type: String, enum: ['Starter', 'Professional', 'Master'], default: 'Starter' },
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  affiliateCommission: { type: Number, default: 0 },
  thumbnail: { type: String }, // Image/Cover URL
  languages: [{ type: String }], // List of available languages
  content: [LanguageContentSchema], // Grouped by language
  resourceBundles: [ResourceBundleSchema], // Course-level downloadable bundles (.zip, .pdf, .xlsx sheets)
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
