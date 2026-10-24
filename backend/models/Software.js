import mongoose from 'mongoose';

export const SOFTWARE_PRICING_TYPES = ['one_time', 'subscription_monthly', 'subscription_yearly', 'starting_from', 'quote'];
export const SOFTWARE_CTA_TYPES = ['buy', 'demo', 'enquire'];

export const PLAN_BILLING = ['monthly', 'yearly', 'lifetime', 'custom_days'];

// A paid plan. Price is read from here on the server for every order (never from the browser).
const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 60 },
  price: { type: Number, required: true, min: 1 },
  billing: { type: String, enum: PLAN_BILLING, default: 'yearly' },
  customDays: { type: Number, min: 1, max: 3650 },      // only for billing "custom_days"
  maxDevices: { type: Number, default: 1, min: 1, max: 1000 },
  features: [{ type: String }],
  gstRate: { type: Number, default: null, min: 0, max: 40 }, // null = product / store default
  gstInclusive: { type: Boolean, default: null },            // null = product default
  hsnSacCode: { type: String, default: '' },                 // empty = product / store default
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
});

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
  // ---- Licensing -----------------------------------------------------------------------
  // appId is what the desktop app sends to the licence API. It is set from the slug when the
  // product is created and does not change if you rename the page later.
  appId: { type: String, index: { unique: true, sparse: true } },
  licensingEnabled: { type: Boolean, default: false },
  plans: [PlanSchema],
  trialEnabled: { type: Boolean, default: true },
  trialDays: { type: Number, default: 7, min: 1, max: 90 },
  trialDownloadUrl: { type: String, default: '' },       // public https:// link to the installer
  trialInstructions: { type: String, default: '' },      // short Markdown shown on the page
  trialUsesPackage: { type: Boolean, default: false },   // let anyone download the uploaded package for the trial
  // Product-level GST defaults for plans (store-wide settings when empty)
  gstRate: { type: Number, default: null, min: 0, max: 40 },
  gstInclusive: { type: Boolean, default: true },
  hsnSacCode: { type: String, default: '' },             // TODO(owner): confirm with your CA
  // Visibility: only "active" is shown publicly
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Software', SoftwareSchema);
