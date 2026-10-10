import express from 'express';
import crypto from 'crypto';
import Software from '../models/Software.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_SOFTWARES = [
  {
    title: 'WideTech AI WhatsApp Support & Lead Bot',
    description: 'Autonomous 24/7 WhatsApp AI Assistant powered by GPT-4o. Qualifies incoming customer enquiries, answers FAQs with zero hallucinations, books meetings, and synchronizes real-time leads to Google Sheets / CRM.',
    category: 'AI Bot & Automation',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    performance: 'Sub-150ms Response • 99.9% Uptime • Zero Server Lock-in',
    usefulness: 'Saves 20+ hours weekly on customer support, captures leads automatically 24/7 without extra human staff.',
    features: [
      'Multi-turn AI conversations in Malayalam & English',
      'Automated Lead qualification & CRM webhook sync',
      'Media message handling (PDF brochures & image catalog)',
      'Custom knowledge base ingestion (FAQ document scanner)',
      'Human-handover alert on WhatsApp'
    ],
    price: 9999,
    discountedPrice: 4999,
    couponEligible: true,
    highlightBadge: 'BESTSELLER',
    isFeatured: true,
    demoUrl: 'https://wa.me/918281760168?text=Hi%20WideTech!%20I%20want%20to%20test%20the%20AI%20WhatsApp%20Bot%20Demo',
    downloadUrl: 'https://github.com/kelothhuller-code/course'
  },
  {
    title: 'Automated Lead Enrichment & Prospecting System',
    description: 'High-speed automated bot that extracts B2B leads from Google Maps / Directories, enriches emails, verifies phone numbers, and generates personalized outreach pitches using AI.',
    category: 'Business Tool',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    performance: 'Scrapes & enriches 1,000+ verified leads/hour • 98% Email accuracy',
    usefulness: 'Directly powers your outbound sales engine. Never run out of high-ticket clients or business contacts.',
    features: [
      'Automated Google Places & Directory lead extraction',
      'Real-time MX-record and SMTP email verification',
      'AI Icebreaker & personalized cold email generator',
      'Export directly to Excel, CSV, or HubSpot CRM'
    ],
    price: 12000,
    discountedPrice: 6499,
    couponEligible: true,
    highlightBadge: 'HIGH ROI',
    isFeatured: true,
    demoUrl: 'https://wa.me/918281760168?text=Hi%20WideTech!%20Show%20me%20the%20Lead%20Enrichment%20System%20Demo'
  },
  {
    title: 'Full-Stack MERN + AI SaaS Production Starter Kit',
    description: 'Complete production-ready boilerplate codebase including Authentication, Razorpay payment gateway, GST automated invoicing, Super Admin control panel, and OpenAI API integration.',
    category: 'Developer Kit',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    performance: 'Deploy in under 10 minutes on Vercel & Render • Zero Tech Debt',
    usefulness: 'Cuts development time by 3 to 4 weeks. Build and sell your own SaaS or client apps effortlessly.',
    features: [
      'React (Vite) + Node.js (Express) + MongoDB architecture',
      'Integrated Razorpay webhook verified checkout & GST receipts',
      'Role-based access control (Student & Super Admin roles)',
      'Pre-built UI components and dark/light luxury styling'
    ],
    price: 5999,
    discountedPrice: 2999,
    couponEligible: true,
    highlightBadge: 'DEVELOPER CHOICE',
    isFeatured: true,
    demoUrl: 'https://widetech.in/'
  }
];

// Helper to seed software products if database is empty
async function ensureSeedSoftwares() {
  const count = await Software.countDocuments();
  if (count === 0) {
    await Software.insertMany(DEFAULT_SOFTWARES);
    console.log('[Software] Initial standard software products seeded successfully.');
  }
}

// GET all active softwares
router.get('/', async (req, res) => {
  try {
    await ensureSeedSoftwares();
    const { category, featured } = req.query;
    const filter = { status: 'active' };
    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;

    const softwares = await Software.find(filter).sort({ isFeatured: -1, createdAt: -1 });
    res.json({ success: true, count: softwares.length, softwares });
  } catch (err) {
    console.error('Error fetching softwares:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch software products' });
  }
});

// GET single software
router.get('/:id', async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software product not found' });
    }
    res.json({ success: true, software });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving software details' });
  }
});

// POST purchase / unlock software for authenticated user
router.post('/:id/unlock', authenticateToken, async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already purchased
    const alreadyOwns = user.purchasedSoftware?.some(p => p.softwareId?.toString() === software._id.toString());
    if (alreadyOwns) {
      return res.json({ success: true, message: 'Already unlocked in your dashboard', software });
    }

    // Generate unique license key
    const licenseKey = `WT-${software.category.substring(0, 3).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    if (!user.purchasedSoftware) user.purchasedSoftware = [];
    user.purchasedSoftware.push({
      softwareId: software._id,
      licenseKey,
      purchasedAt: new Date(),
      status: 'active'
    });

    await user.save();
    res.json({ success: true, message: 'Software unlocked successfully!', licenseKey });
  } catch (err) {
    console.error('Error unlocking software:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to unlock software' });
  }
});

export default router;
