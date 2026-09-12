import mongoose from 'mongoose';

const GstConfigSchema = new mongoose.Schema({
  legalName: { type: String, default: 'WIDETECHNOS ACADEMY PRIVATE LIMITED' },
  tradeName: { type: String, default: 'WIDETECHNOS ACADEMY' },
  gstin: { type: String, default: '33AAAAA0000A1Z5' },
  sellerState: { type: String, default: 'Tamil Nadu' },
  sellerStateCode: { type: String, default: '33' },
  registeredAddress: { type: String, default: '123 Tech Park, Anna Salai, Chennai, Tamil Nadu - 600002' },
  phone: { type: String, default: '+91 98765 43210' },
  email: { type: String, default: 'billing@widetechnos.com' },
  hsnSacCode: { type: String, default: '999249' }, // Online education services
  gstRate: { type: Number, default: 18 }, // Percentage
  isInclusive: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('GstConfig', GstConfigSchema);
