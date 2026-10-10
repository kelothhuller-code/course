import mongoose from 'mongoose';

const GstConfigSchema = new mongoose.Schema({
  legalName: { type: String, default: 'WIDE VENTURES' },
  tradeName: { type: String, default: 'WIDE VENTURES (WIDE TECH / BROFFY)' },
  gstin: { type: String, default: '32FBEPK9712B1Z0' },
  sellerState: { type: String, default: 'Kerala' },
  sellerStateCode: { type: String, default: '32' },
  registeredAddress: { type: String, default: '8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731' },
  phone: { type: String, default: '+91 98765 43210' },
  email: { type: String, default: 'billing@widetech.in' },
  hsnSacCode: { type: String, default: '999249' }, // Online education services
  gstRate: { type: Number, default: 18 }, // Percentage
  isInclusive: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('GstConfig', GstConfigSchema);
