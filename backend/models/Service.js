import mongoose from 'mongoose';

export const SERVICE_PRICING_TYPES = ['fixed', 'starting_from', 'quote'];
export const SERVICE_CTA_TYPES = ['book_call', 'quote', 'enquire'];
export const SERVICE_ICONS = ['briefcase', 'automation', 'code', 'chart', 'support', 'cloud', 'document', 'spark'];

// How a service is sold: fixed price only (Buy now), quotation only (enquiry form) or both.
export const SERVICE_PURCHASE_MODES = ['quote', 'fixed', 'both'];

// A fixed-price package (e.g. Basic / Standard / Premium). Price is always read from here server-side.
const PackageSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 60 },
  price: { type: Number, required: true, min: 1 },
  discountedPrice: { type: Number, min: 0 },
  deliverables: [{ type: String }],
  deliveryTime: { type: String, default: '' },               // e.g. "5 working days"
  gstRate: { type: Number, default: null, min: 0, max: 40 }, // null = service / store default
  gstInclusive: { type: Boolean, default: null },            // null = service default
  hsnSacCode: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
});

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },          // service name
  slug: { type: String, index: true, sparse: true }, // URL: /services/:slug
  summary: { type: String, default: '' },
  description: { type: String, default: '' },       // Markdown (rendered safely on the site)
  // Admin-managed category name (see Category model, kind "service"). No fixed enum.
  category: { type: String, default: '' },
  icon: { type: String, default: 'briefcase' },
  thumbnail: { type: String, default: '' },
  // Legacy free-text fields kept for backwards compatibility (no invented defaults)
  performance: { type: String, default: '' },
  usefulness: { type: String, default: '' },
  deliverables: [{ type: String }],
  processSteps: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    _id: false,
  }],
  pricingType: { type: String, enum: SERVICE_PRICING_TYPES, default: 'quote' },
  startingPrice: { type: Number, default: 0, min: 0 }, // the price (fixed or "starting from"); ignored for "quote"
  discountedPrice: { type: Number, min: 0 },
  ctaType: { type: String, enum: SERVICE_CTA_TYPES, default: 'enquire' },
  purchaseMode: { type: String, enum: SERVICE_PURCHASE_MODES, default: 'quote' },
  packages: [PackageSchema],
  gstRate: { type: Number, default: null, min: 0, max: 40 },
  gstInclusive: { type: Boolean, default: true },
  hsnSacCode: { type: String, default: '' }, // TODO(owner): confirm with your CA
  couponEligible: { type: Boolean, default: false },
  highlightBadge: { type: String, default: '' },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0, min: 0, max: 999 }, // lower = shown first
  enquiryCount: { type: Number, default: 0 },
  // Visibility: only "active" is shown publicly
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Service', ServiceSchema);
