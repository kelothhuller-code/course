import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  txnid: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  itemType: { type: String, enum: ['course', 'event', 'software', 'service'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  // Software plan / service package bought (empty for courses and events)
  variantId: { type: mongoose.Schema.Types.ObjectId },
  variantName: { type: String },
  itemTitle: { type: String },
  renewLicenseId: { type: mongoose.Schema.Types.ObjectId }, // set when this payment renews a licence
  listPrice: { type: Number }, // price before GST for exclusive items (amount is always what was charged)
  variantSnapshot: { type: Object }, // plan/package terms at the time of purchase (billing, days, devices…)
  productFulfilledAt: { type: Date }, // set once a licence / service order has been created for this payment
  licenseId: { type: mongoose.Schema.Types.ObjectId },
  serviceOrderId: { type: mongoose.Schema.Types.ObjectId },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
  couponCode: { type: String },
  invoiceNo: { type: String }, // Official tax invoice number
  creditNoteNo: { type: String }, // Official GST Credit Note number (GSTR-1 Sec 9B)
  refundDetails: {
    refundId: { type: String },
    refundAmount: { type: Number },
    refundDate: { type: Date },
    refundReason: { type: String },
    refundBaseAmount: { type: Number },
    refundGstAmount: { type: Number },
    refundCgstAmount: { type: Number },
    refundSgstAmount: { type: Number },
    refundIgstAmount: { type: Number }
  },
  billingDetails: {
    buyerName: { type: String },
    buyerEmail: { type: String },
    buyerPhone: { type: String },
    buyerAddress: { type: String },
    buyerState: { type: String },
    buyerGstin: { type: String },
    isB2B: { type: Boolean, default: false }
  },
  gstDetails: {
    rate: { type: Number, default: 18 },
    isInclusive: { type: Boolean, default: true },
    baseAmount: { type: Number, default: 0 }, // Taxable value
    gstAmount: { type: Number, default: 0 },  // Total GST
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    isIntraState: { type: Boolean, default: true },
    hsnSacCode: { type: String, default: '999249' },
    posState: { type: String } // Place of Supply state
  },
  gateway: { type: String, default: 'razorpay' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  razorpayResponse: { type: Object },
  payuResponse: { type: Object }, // Store the JSON response from PayU webhook/callback
  createdAt: { type: Date, default: Date.now }
});

// Indexes for fast payment lookups and verification
TransactionSchema.index({ txnid: 1 });
TransactionSchema.index({ razorpayOrderId: 1 }, { sparse: true });

export default mongoose.model('Transaction', TransactionSchema);
