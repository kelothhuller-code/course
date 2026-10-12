import express from 'express';
import crypto from 'crypto';
import Software from '../models/Software.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import Lead from '../models/Lead.js';
import { authenticateToken, isUserAdmin } from '../middleware/auth.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const softwareUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'software');

// GET all active softwares (only real added software, no hardcoded fallbacks)
router.get('/', async (req, res) => {
  try {
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

// POST submit software enquiry (No WhatsApp redirection needed)
router.post('/enquire', async (req, res) => {
  try {
    const { softwareId, name, email, phone, requirements, companyName } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    let softwareTitle = 'WideTech Software Tool';
    if (softwareId) {
      const sw = await Software.findById(softwareId);
      if (sw) {
        softwareTitle = sw.title;
        sw.enquiryCount = (sw.enquiryCount || 0) + 1;
        await sw.save();
      }
    }

    // Save as ContactMessage in DB
    await ContactMessage.create({
      name,
      email,
      subject: `Software Enquiry: ${softwareTitle}`,
      message: `Phone: ${phone || 'N/A'}\nCompany: ${companyName || 'N/A'}\nRequirements: ${requirements || 'Interested in software purchase / license'}`
    });

    // Save or update Lead in DB
    await Lead.findOneAndUpdate(
      { email: email.toLowerCase() },
      { name, source: 'software_enquiry' },
      { upsert: true, new: true }
    );

    // If matching user exists, attach to their purchasedSoftware as enquiry
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (!existingUser.purchasedSoftware) existingUser.purchasedSoftware = [];
      const alreadyHas = existingUser.purchasedSoftware.find(
        p => p.softwareId?.toString() === softwareId?.toString()
      );
      if (!alreadyHas) {
        existingUser.purchasedSoftware.push({
          softwareId: softwareId || null,
          purchasedAt: new Date(),
          status: 'enquired',
          requirements: requirements || `Inquiry for ${softwareTitle}`,
          contactPhone: phone || ''
        });
        await existingUser.save();
      }
    }

    res.json({
      success: true,
      message: 'Thank you! Your software enquiry has been received. Our team will contact you directly.'
    });
  } catch (err) {
    console.error('Error submitting software enquiry:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to submit software enquiry' });
  }
});

// POST purchase / unlock software for authenticated user
router.post('/:id/unlock', authenticateToken, async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software not found' });
    }

    const isFree = software.price === 0 || software.isFree;
    const isAdmin = isUserAdmin(req.user);

    if (!isFree && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'This is a commercial software product. Please complete purchase checkout to unlock.'
      });
    }

    const user = await User.findById(req.user.id || req.user._id);
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

// GET download software package file from server folder (Protected: Requires Purchase, Admin, or Free)
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software product not found' });
    }

    const user = req.user;
    const isAdmin = isUserAdmin(user);
    const isFree = software.price === 0 || software.isFree;
    const isPurchased = user.purchasedSoftware?.some(
      p => p.softwareId?.toString() === software._id.toString()
    );

    if (!isAdmin && !isFree && !isPurchased) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You must purchase or unlock this software product before downloading.'
      });
    }

    const privateDir = path.join(__dirname, '..', 'private_storage', 'software');
    const safeBaseName = (name) => path.basename(name);

    if (software.fileName) {
      const fileName = safeBaseName(software.fileName);
      const privatePath = path.join(privateDir, fileName);
      if (fs.existsSync(privatePath)) {
        return res.download(privatePath, fileName);
      }
      const publicPath = path.join(softwareUploadDir, fileName);
      if (fs.existsSync(publicPath)) {
        return res.download(publicPath, fileName);
      }
    }

    if (software.downloadUrl) {
      if (software.downloadUrl.startsWith('/uploads/software/')) {
        const localName = safeBaseName(software.downloadUrl);
        const privatePath = path.join(privateDir, localName);
        if (fs.existsSync(privatePath)) {
          return res.download(privatePath, localName);
        }
        const publicPath = path.join(softwareUploadDir, localName);
        if (fs.existsSync(publicPath)) {
          return res.download(publicPath, localName);
        }
      }
      return res.redirect(software.downloadUrl);
    }

    res.status(404).json({ success: false, message: 'Software download package not configured on server' });
  } catch (err) {
    console.error('Download software error:', err);
    res.status(500).json({ success: false, message: 'Failed to download software' });
  }
});

export default router;
