import express from 'express';
import Service from '../models/Service.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import Lead from '../models/Lead.js';

const router = express.Router();

// GET all active services (only added services from database)
router.get('/', async (req, res) => {
  try {
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
