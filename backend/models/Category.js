import mongoose from 'mongoose';

/**
 * Admin-managed categories for courses, software and services.
 * Items keep storing the category *name* as a string (backwards compatible with
 * existing data); renaming a category in the admin updates the items too.
 */
const CategorySchema = new mongoose.Schema({
  kind: { type: String, enum: ['course', 'software', 'service'], required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  slug: { type: String, required: true, trim: true, maxlength: 80 },
  order: { type: Number, default: 0, min: 0, max: 999 },
  isVisible: { type: Boolean, default: true },
}, { timestamps: true });

CategorySchema.index({ kind: 1, slug: 1 }, { unique: true });

export default mongoose.model('Category', CategorySchema);
