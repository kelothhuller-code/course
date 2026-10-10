import mongoose from 'mongoose';

const SoftwareSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['AI Bot & Automation', 'Custom Software', 'Business Tool', 'Developer Kit', 'SaaS Template'],
    default: 'AI Bot & Automation' 
  },
  thumbnail: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80' 
  },
  performance: { 
    type: String, 
    default: 'Sub-100ms LLM Response • 99.9% Uptime' 
  },
  usefulness: { 
    type: String, 
    default: 'Automates 80% of customer support & qualifies leads 24/7' 
  },
  features: [{ type: String }],
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  couponEligible: { type: Boolean, default: true },
  highlightBadge: { type: String, default: '' }, // e.g. "HOT", "BESTSELLER", "FEATURED", "ENTERPRISE"
  isFeatured: { type: Boolean, default: false },
  downloadUrl: { type: String, default: '' },
  filePath: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: String, default: '' },
  version: { type: String, default: '1.0.0' },
  demoUrl: { type: String, default: '' },
  documentationUrl: { type: String, default: '' },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Software', SoftwareSchema);
