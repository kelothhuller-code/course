import express from 'express';
import { getOrInitGstConfig } from './gstRoutes.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import Lead from '../models/Lead.js';
import { validateEnquiry, isValidObjectId, notifyNewEnquiry } from '../utils/enquiry.js';
import { publicService, CATALOG_SORT } from '../utils/catalog.js';

const router = express.Router();

// GET all publicly visible services (status "active"), in admin order.
// ?featured=true → only featured; ?limit=N; ?category=Name
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    const filter = { status: 'active' };
    if (typeof category === 'string' && category) filter.category = category.slice(0, 60);
    if (featured === 'true') filter.isFeatured = true;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 0, 0), 100);

    let query = Service.find(filter).sort(CATALOG_SORT);
    if (limit) query = query.limit(limit);
    const gstConfig = await getOrInitGstConfig();
    const services = (await query).map((d) => publicService(d, gstConfig));
    res.json({ success: true, count: services.length, services });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// GET single service by slug or id
router.get('/:slugOrId', async (req, res) => {
  try {
    const key = String(req.params.slugOrId).slice(0, 100);
    const filter = isValidObjectId(key) ? { _id: key } : { slug: key };
    const service = await Service.findOne({ ...filter, status: 'active' });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    const gstConfig = await getOrInitGstConfig();
    res.json({ success: true, service: publicService(service, gstConfig), sellerState: gstConfig.sellerState || '' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving service details' });
  }
});

// POST submit service enquiry
router.post('/enquire', async (req, res) => {
  try {
    const { requirements, companyName } = req.body;
    // Validate input (email format, lengths, optional phone) instead of trusting raw body values
    const { data, error } = validateEnquiry({ ...req.body, message: requirements, interest: 'Service' }, { requireMessage: false });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    const { name, email, phone } = data;
    // An invalid id used to throw a Mongoose CastError → HTTP 500; treat it as "no specific item"
    const serviceId = isValidObjectId(req.body.serviceId) ? req.body.serviceId : null;

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
    const enquiryRecord = {
      name,
      email,
      phone,
      interest: 'Service',
      source: 'service_modal',
      subject: `Service Enquiry: ${serviceTitle}`,
      message: `Phone: ${phone || 'N/A'}\nCompany: ${companyName || 'N/A'}\nRequirements: ${requirements || 'Interested in consultation'}`
    };
    await ContactMessage.create(enquiryRecord);
    notifyNewEnquiry(enquiryRecord);

    // Save or update Lead
    await Lead.findOneAndUpdate(
      { email },
      { name, source: 'service_enquiry' },
      { upsert: true, new: true }
    );

    // If matching user exists, attach to their purchasedServices/enquiries
    const existingUser = await User.findOne({ email });
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
