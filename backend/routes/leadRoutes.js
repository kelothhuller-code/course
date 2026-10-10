import express from 'express';
import Lead from '../models/Lead.js';
import ContactMessage from '../models/ContactMessage.js';
import { protect, admin } from '../middleware/auth.js';
import { sendCustomEmail, getEmailBrandHeader, getEmailBrandFooter } from '../utils/mailer.js';

const router = express.Router();

// @desc    Capture a new lead (email signup)
// @route   POST /api/leads
// @access  Public
router.post('/', async (req, res) => {
  const { email, name, source } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  try {
    const existingLead = await Lead.findOne({ email: email.toLowerCase().trim() });
    if (existingLead) {
      return res.status(200).json({ message: 'You are already on the list!', alreadyExists: true });
    }

    await Lead.create({
      email: email.toLowerCase().trim(),
      name: name || '',
      source: source || 'landing_page',
    });

    res.status(201).json({ message: 'Successfully subscribed! Check your email for the free resource.' });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// @desc    Submit student/visitor contact inquiry
// @route   POST /api/leads/contact
// @access  Public
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required.' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  try {
    const newQuery = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: (subject || 'General Inquiry').trim(),
      message: message.trim(),
      status: 'unread',
    });

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been received! Our support team will get back to you shortly.',
      id: newQuery._id
    });
  } catch (error) {
    console.error('Contact inquiry submission error:', error);
    res.status(500).json({ message: 'Failed to submit inquiry. Please try again later.' });
  }
});

// @desc    Get all contact messages (Admin Inbox)
// @route   GET /api/leads/messages
// @access  Private/Admin
router.get('/messages', protect, admin, async (req, res) => {
  try {
    const messages = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

// @desc    Reply to a contact inquiry via email & update status
// @route   POST /api/leads/messages/:id/reply
// @access  Private/Admin
router.post('/messages/:id/reply', protect, admin, async (req, res) => {
  const { replyText, customSubject } = req.body;

  if (!replyText || !replyText.trim()) {
    return res.status(400).json({ message: 'Reply message text is required.' });
  }

  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Contact message not found.' });
    }

    const emailSubject = customSubject || `Re: ${msg.subject} - WIDETECHNOS Academy Support`;

    // Attempt to send email reply
    let emailSent = false;
    try {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
          ${getEmailBrandHeader()}
          <div style="font-size: 15px; line-height: 1.6; color: #334155;">
            <p>Hi <strong>${msg.name}</strong>,</p>
            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 16px 0; border-radius: 6px;">
              ${replyText.trim().replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #64748b;">
              <strong>Your Original Inquiry:</strong><br>
              <em>"${msg.message.replace(/\n/g, '<br>')}"</em>
            </div>
          </div>
          ${getEmailBrandFooter()}
        </div>
      `;

      await sendCustomEmail(msg.email, emailSubject, replyText, emailHtml);
      emailSent = true;
    } catch (mailErr) {
      console.warn('Could not dispatch live email, but saving reply to database:', mailErr.message);
    }

    // Save reply record
    msg.status = 'replied';
    msg.replyMessage = replyText.trim();
    msg.repliedAt = new Date();
    await msg.save();

    res.json({
      success: true,
      message: emailSent 
        ? `Reply sent directly to ${msg.email} and recorded!` 
        : `Reply recorded in system (Email notification logged).`,
      messageRecord: msg
    });
  } catch (error) {
    console.error('Reply inquiry error:', error);
    res.status(500).json({ message: 'Failed to send reply', error: error.message });
  }
});

// @desc    Delete a contact message
// @route   DELETE /api/leads/messages/:id
// @access  Private/Admin
router.delete('/messages/:id', protect, admin, async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Contact message not found.' });
    }
    res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
});

export default router;
