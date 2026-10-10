import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['AI Bot Automation', 'Custom Software', 'Mobile App Development', 'Enterprise Workflow', 'Consulting & AI Integration'],
    default: 'AI Bot Automation'
  },
  thumbnail: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' 
  },
  performance: { 
    type: String, 
    default: 'Turnaround: 7-14 Days • 100% Bespoke Code' 
  },
  usefulness: { 
    type: String, 
    default: 'Custom AI bots and software engineered directly for your business operations' 
  },
  deliverables: [{ type: String }],
  startingPrice: { type: Number, default: 0 }, // 0 = Custom quote
  discountedPrice: { type: Number },
  couponEligible: { type: Boolean, default: false },
  highlightBadge: { type: String, default: '' }, // e.g. "HIGH ROI", "MOST REQUESTED", "FEATURED"
  isFeatured: { type: Boolean, default: false },
  enquiryCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Service', ServiceSchema);
