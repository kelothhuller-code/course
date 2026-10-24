import mongoose from 'mongoose';

export const QUESTION_TYPES = ['text', 'textarea', 'select', 'multiselect', 'number', 'range', 'catalog'];

/**
 * One "What are you looking for?" option of the business enquiry form,
 * with its own follow-up questions. Fully editable in the admin
 * (Admin → Enquiry Form). Defaults live in utils/enquiryDefaults.js.
 */
const OptionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 120 },
  score: { type: Number, default: 0, min: 0, max: 10 }, // lead-score points when chosen
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 40 },
  label: { type: String, required: true, trim: true, maxlength: 160 },
  type: { type: String, enum: QUESTION_TYPES, default: 'text' },
  options: [OptionSchema],            // select / multiselect
  catalogSource: { type: String, enum: ['software', 'service', 'both', ''], default: '' }, // type "catalog"
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: '', maxlength: 160 },
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  step: { type: Number, default: null },
  unit: { type: String, default: '', maxlength: 30 },
  order: { type: Number, default: 0 },
}, { _id: false });

const EnquiryCategorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 200 },
  icon: { type: String, default: 'spark', maxlength: 30 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  questions: [QuestionSchema],
}, { timestamps: true });

export default mongoose.model('EnquiryCategory', EnquiryCategorySchema);
