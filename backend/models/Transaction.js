import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  txnid: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, enum: ['course', 'event'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  payuResponse: { type: Object }, // Store the JSON response from PayU webhook/callback
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Transaction', TransactionSchema);
