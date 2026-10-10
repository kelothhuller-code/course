import express from 'express';
import Service from '../models/Service.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import Lead from '../models/Lead.js';

const router = express.Router();

const DEFAULT_SERVICES = [
  {
    title: 'Custom AI Bot & Workflow Automation',
    description: 'We design and deploy fully customized AI WhatsApp bots, Telegram assistants, and automated business workflows that talk to your proprietary databases, qualify inbound leads, and trigger internal alerts.',
    category: 'AI Bot Automation',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    performance: 'Rapid 7-10 Days Turnaround • Custom LLM Prompt Tuning • High Accuracy',
    usefulness: 'Completely removes manual support bottleneck. Operates 24/7/365 with multilingual Malayalam & English proficiency.',
    deliverables: [
      'Official Meta WhatsApp Business Cloud API integration',
      'Knowledge ingestion with custom company FAQs & PDFs',
      'Google Sheets, Zoho, or webhook CRM synchronization',
      'Full administrative handover and training session',
      '30 days dedicated support & maintenance'
    ],
    startingPrice: 14999,
    discountedPrice: 9999,
    highlightBadge: 'MOST POPULAR',
    isFeatured: true
  },
  {
    title: 'Custom Software & Web Application Development',
    description: 'Bespoke web applications, SaaS platforms, ERP micro-portals, and client management software built with ultra-modern scalable architecture (React, Node.js, Next.js, and Cloud Infrastructure).',
    category: 'Custom Software',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    performance: 'Sub-second page speeds • Enterprise-grade encryption • Scalable to millions',
    usefulness: 'Turn your unique business requirements or product vision into a bulletproof commercial software application.',
    deliverables: [
      'Interactive UI/UX design & prototype',
      'Scalable full-stack application development',
      'Payment gateways (Razorpay, Stripe) & GST invoices',
      'Role-based admin control dashboards',
      'Deployment to AWS / Vercel / DigitalOcean'
    ],
    startingPrice: 24999,
    discountedPrice: 19999,
    highlightBadge: 'ENTERPRISE',
    isFeatured: true
  },
  {
    title: 'Mobile App Engineering (iOS & Android)',
    description: 'Native-feel cross-platform mobile apps for startups and local businesses. Push notifications, offline caching, GPS tracking, and seamless camera/media capabilities.',
    category: 'Mobile App Development',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    performance: 'Smooth 60 FPS • Lightweight APK/IPA • Play Store & App Store Ready',
    usefulness: 'Direct real estate on your customers’ home screens with instant push engagement and mobile commerce.',
    deliverables: [
      'Cross-platform Flutter / React Native architecture',
      'Authentication via Mobile OTP / Google Login',
      'Real-time push notifications setup (Firebase)',
      'Assistance with Google Play Store & Apple App Store submission'
    ],
    startingPrice: 29999,
    discountedPrice: 24999,
    highlightBadge: 'HIGH IMPACT',
    isFeatured: true
  }
];

// Helper to seed services if database is empty
async function ensureSeedServices() {
  const count = await Service.countDocuments();
  if (count === 0) {
    await Service.insertMany(DEFAULT_SERVICES);
    console.log('[Service] Initial WideTech services seeded successfully.');
  }
}

// GET all active services
router.get('/', async (req, res) => {
  try {
    await ensureSeedServices();
    const { category, featured } = req.query;
    const filter = { status: 'active' };
    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;

    const services = await Service.find(filter).sort({ isFeatured: -1, createdAt: -1 });
    res.json({ success: true, count: services.length, services });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// GET single service
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving service details' });
  }
});

// POST submit service enquiry
router.post('/enquire', async (req, res) => {
  try {
    const { serviceId, name, email, phone, requirements, companyName } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    let serviceTitle = 'Custom Technology & Bot Service';
    if (serviceId) {
      const s = await Service.findById(serviceId);
      if (s) {
        serviceTitle = s.title;
        s.enquiryCount = (s.enquiryCount || 0) + 1;
        await s.save();
      }
    }

    // Save as ContactMessage
    await ContactMessage.create({
      name,
      email,
      subject: `Service Enquiry: ${serviceTitle}`,
      message: `Phone: ${phone || 'N/A'}\nCompany: ${companyName || 'N/A'}\nRequirements: ${requirements || 'Interested in consultation'}`
    });

    // Save or update Lead
    await Lead.findOneAndUpdate(
      { email: email.toLowerCase() },
      { name, source: 'service_enquiry' },
      { upsert: true, new: true }
    );

    // If matching user exists, attach to their purchasedServices/enquiries
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (!existingUser.purchasedServices) existingUser.purchasedServices = [];
      existingUser.purchasedServices.push({
        serviceId: serviceId || null,
        enquiredAt: new Date(),
        status: 'enquired',
        requirements: requirements || `Inquiry for ${serviceTitle}`,
        contactPhone: phone || ''
      });
      await existingUser.save();
    }

    res.json({
      success: true,
      message: 'Thank you! Your enquiry has been received. WideTech engineering team will reach out within 24 hours.'
    });
  } catch (err) {
    console.error('Error submitting service enquiry:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to submit enquiry' });
  }
});

export default router;
