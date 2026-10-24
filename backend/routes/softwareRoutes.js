import express from 'express';
import { getOrInitGstConfig } from './gstRoutes.js';
import crypto from 'crypto';
import License from '../models/License.js';
import Software from '../models/Software.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import Lead from '../models/Lead.js';
import { validateEnquiry, isValidObjectId, notifyNewEnquiry } from '../utils/enquiry.js';
import { authenticateToken, isUserAdmin } from '../middleware/auth.js';
import { publicSoftware, CATALOG_SORT } from '../utils/catalog.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const softwareUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'software');

// GET all publicly visible software (status "active"), in admin order.
// ?featured=true → only featured; ?limit=N; ?category=Name
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    const filter = { status: 'active' };
    if (typeof category === 'string' && category) filter.category = category.slice(0, 60);
    if (featured === 'true') filter.isFeatured = true;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 0, 0), 100);

    let query = Software.find(filter).sort(CATALOG_SORT);
    if (limit) query = query.limit(limit);
    const gstConfig = await getOrInitGstConfig();
    const softwares = (await query).map((d) => publicSoftware(d, gstConfig));
    res.json({ success: true, count: softwares.length, softwares });
  } catch (err) {
    console.error('Error fetching softwares:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch software products' });
  }
});

// GET single software by slug or id (public view — never includes the paid download location)
router.get('/:slugOrId', async (req, res) => {
  try {
    const key = String(req.params.slugOrId).slice(0, 100);
    const filter = isValidObjectId(key) ? { _id: key } : { slug: key };
    const software = await Software.findOne({ ...filter, status: 'active' });
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software product not found' });
    }
    const gstConfig = await getOrInitGstConfig();
    // sellerState lets checkout preview CGST+SGST vs IGST (the server recalculates when ordering)
    res.json({ success: true, software: publicSoftware(software, gstConfig), sellerState: gstConfig.sellerState || '' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving software details' });
  }
});

// POST submit software enquiry (No WhatsApp redirection needed)
router.post('/enquire', async (req, res) => {
  try {
    const { requirements, companyName } = req.body;
    // Validate input (email format, lengths, optional phone) instead of trusting raw body values
    const { data, error } = validateEnquiry({ ...req.body, message: requirements, interest: 'Software' }, { requireMessage: false });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    const { name, email, phone } = data;
    // An invalid id used to throw a Mongoose CastError → HTTP 500; treat it as "no specific item"
    const softwareId = isValidObjectId(req.body.softwareId) ? req.body.softwareId : null;

    let softwareTitle = 'WideTech Software Tool';
    if (softwareId) {
      const sw = await Software.findById(softwareId);
      if (sw) softwareTitle = sw.title;
    }

    // Save as ContactMessage in DB
    const enquiryRecord = {
      name,
      email,
      phone,
      interest: 'Software',
      source: 'software_modal',
      subject: `Software Enquiry: ${softwareTitle}`,
      message: `Phone: ${phone || 'N/A'}\nCompany: ${companyName || 'N/A'}\nRequirements: ${requirements || 'Interested in software purchase / license'}`
    };
    await ContactMessage.create(enquiryRecord);
    notifyNewEnquiry(enquiryRecord);

    // Save or update Lead in DB
    await Lead.findOneAndUpdate(
      { email },
      { name, source: 'software_enquiry' },
      { upsert: true, new: true }
    );

    // If matching user exists, attach to their purchasedSoftware as enquiry
    const existingUser = await User.findOne({ email });
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

/** Streams the uploaded package (private storage first) or redirects to the external link. Returns false if none. */
const sendPackage = (res, software, { json = false } = {}) => {
  const privateDir = path.join(__dirname, '..', 'private_storage', 'software');
  const safeBaseName = (name) => path.basename(name);

  if (software.fileName) {
    const fileName = safeBaseName(software.fileName);
    const privatePath = path.join(privateDir, fileName);
    if (fs.existsSync(privatePath)) {
      res.download(privatePath, fileName);
      return true;
    }
    const publicPath = path.join(softwareUploadDir, fileName);
    if (fs.existsSync(publicPath)) {
      res.download(publicPath, fileName);
      return true;
    }
  }

  if (software.downloadUrl) {
    if (software.downloadUrl.startsWith('/uploads/software/')) {
      const localName = safeBaseName(software.downloadUrl);
      const privatePath = path.join(privateDir, localName);
      if (fs.existsSync(privatePath)) {
        res.download(privatePath, localName);
        return true;
      }
      const publicPath = path.join(softwareUploadDir, localName);
      if (fs.existsSync(publicPath)) {
        res.download(publicPath, localName);
        return true;
      }
    }
    // An external package URL: the dashboard fetches downloads with the login token, so it asks
    // for JSON (?format=json) and opens the URL itself instead of following a cross-site redirect.
    if (json) res.json({ success: true, url: software.downloadUrl });
    else res.redirect(software.downloadUrl);
    return true;
  }

  return false;
};

// GET free-trial download (public). Only when the admin turned on the trial for this product:
// an external trial link, or the uploaded package if "use the package for the trial" is on.
// The app itself stays locked until it gets a trial or licence from the licence API.
router.get('/:id/trial-download', async (req, res) => {
  try {
    if (!isValidObjectId(String(req.params.id))) return res.status(400).json({ success: false, message: 'Invalid id' });
    const software = await Software.findOne({ _id: req.params.id, status: 'active', licensingEnabled: true });
    if (!software || !software.trialEnabled) return res.status(404).json({ success: false, message: 'No free trial for this product' });
    if (software.trialDownloadUrl) return res.redirect(software.trialDownloadUrl);
    if (software.trialUsesPackage && sendPackage(res, software)) return undefined;
    return res.status(404).json({ success: false, message: 'Trial download is not configured yet' });
  } catch (err) {
    console.error('Trial download error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to download' });
  }
});

// GET download software package file from server folder (Protected: Requires Purchase, Admin, or Free)
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(String(req.params.id))) return res.status(400).json({ success: false, message: 'Invalid id' });
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software product not found' });
    }

    const user = req.user;
    const isAdmin = isUserAdmin(user);
    const isFree = software.price === 0 || software.isFree;
    // Enquiries are stored in the same list with status "enquired" — they must not unlock downloads
    const isPurchased = user.purchasedSoftware?.some(
      p => p.softwareId?.toString() === software._id.toString() && p.status !== 'enquired'
    );

    // Licence holders may download too.
    const hasLicense = !isAdmin && !isFree && !isPurchased && await License.exists({
      software: software._id,
      revoked: false,
      // Same rule as the dashboard: email-only licences count if issued after the account existed.
      $or: [
        { userId: user._id },
        { email: String(user.email || '').toLowerCase(), createdAt: { $gte: user.createdAt ? new Date(user.createdAt) : new Date() } },
      ],
    });

    if (!isAdmin && !isFree && !isPurchased && !hasLicense) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You must purchase or unlock this software product before downloading.'
      });
    }

    if (sendPackage(res, software, { json: req.query.format === 'json' })) return undefined;

    res.status(404).json({ success: false, message: 'Software download package not configured on server' });
  } catch (err) {
    console.error('Download software error:', err);
    res.status(500).json({ success: false, message: 'Failed to download software' });
  }
});

export default router;
