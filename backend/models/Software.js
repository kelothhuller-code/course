import mongoose from 'mongoose';

export const SOFTWARE_PRICING_TYPES = ['one_time', 'subscription_monthly', 'subscription_yearly', 'starting_from', 'quote'];
export const SOFTWARE_CTA_TYPES = ['buy', 'demo', 'enquire'];

const SoftwareSchema = new mongoose.Schema({
  title: { type: String, required: true },          // product name
  slug: { type: String, index: true, sparse: true }, // URL: /software/:slug
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },       // Markdown (rendered safely on the site)
  // Admin-managed category name (see Category model, kind "software"). No fixed enum.
  category: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  images: [{ type: String }],                       // screenshots / gallery
  // Legacy free-text fields kept for backwards compatibility (no invented defaults)
  performance: { type: String, default: '' },
  usefulness: { type: String, default: '' },
  features: [{ type: String }],
  pricingType: { type: String, enum: SOFTWARE_PRICING_TYPES, default: 'one_time' },
  price: { type: Number, default: 0, min: 0 },
  discountedPrice: { type: Number, min: 0 },
  ctaType: { type: String, enum: SOFTWARE_CTA_TYPES, default: 'enquire' },
  couponEligible: { type: Boolean, default: true },
  highlightBadge: { type: String, default: '' },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0, min: 0, max: 999 }, // lower = shown first
  downloadUrl: { type: String, default: '' },
  filePath: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: String, default: '' },
  version: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  documentationUrl: { type: String, default: '' },
  // Visibility: only "active" is shown publicly
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Software', SoftwareSchema);
