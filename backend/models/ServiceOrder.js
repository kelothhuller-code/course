import mongoose from 'mongoose';

export const SERVICE_ORDER_STATUSES = ['paid', 'in_progress', 'delivered', 'closed'];

// Created after a verified payment for a fixed-price service / package.
const ServiceOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceTitle: { type: String, default: '' },
  packageId: { type: mongoose.Schema.Types.ObjectId },
  packageName: { type: String, default: '' },
  deliveryTime: { type: String, default: '' },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true },
  txnid: { type: String, default: '' },
  invoiceNo: { type: String, default: '' },
  amount: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerName: { type: String, default: '' },
  buyerEmail: { type: String, default: '' },
  buyerPhone: { type: String, default: '' },
  status: { type: String, enum: SERVICE_ORDER_STATUSES, default: 'paid', index: true },
  adminNotes: { type: String, default: '' },
  // When each status was reached (shown to the buyer as a timeline). Older orders may not have it.
  statusHistory: [{ status: { type: String, enum: SERVICE_ORDER_STATUSES }, at: { type: Date, default: Date.now }, _id: false }],
}, { timestamps: true });

export default mongoose.model('ServiceOrder', ServiceOrderSchema);
