import express from 'express';
import Lead from '../models/Lead.js';
import ContactMessage from '../models/ContactMessage.js';
import NewsletterConfig from '../models/NewsletterConfig.js';
import { protect, admin } from '../middleware/auth.js';
import { sendCustomEmail, getEmailBrandHeader, getEmailBrandFooter } from '../utils/mailer.js';

const router = express.Router();

// Helper to get or initialize Newsletter Config
const getOrInitNewsletterConfig = async () => {
  let config = await NewsletterConfig.findOne({});
  if (!config) {
    config = await NewsletterConfig.create({
      welcomeSubject: '🎁 Your Free AI Starter Toolkit & Free Courses Access - WIDETECHNOS Academy',
      welcomeHeadline: 'Welcome to WIDETECHNOS Academy! Here is your Free AI Toolkit & Resources',
      welcomeMessage: 'Thank you for joining our community! We are thrilled to share our curated AI tools cheat sheet, prompt templates, and structured learning roadmap with you.',
      freeCourseUrl: 'https://widetech.in/#courses',
      toolkitPdfUrl: 'https://widetech.in/resources/ai-starter-toolkit.pdf',
      autoSendWelcome: true,
    });
  }
  return config;
};

// @desc    Capture a new lead & automatically dispatch welcome email with free toolkit & course links
// @route   POST /api/leads
// @access  Public
router.post('/', async (req, res) => {
  const { email, name, source } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    let lead = await Lead.findOne({ email: cleanEmail });
    const isNewSubscriber = !lead;

    if (lead) {
      lead.isSubscribed = true;
      lead.name = (name || lead.name).trim();
      await lead.save();
    } else {
      lead = await Lead.create({
        email: cleanEmail,
        name: (name || '').trim(),
        source: source || 'landing_page',
        isSubscribed: true,
      });
    }

    // Dispatch automated welcome email
    const config = await getOrInitNewsletterConfig();
    const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://widetech.in';
    const unsubscribeLink = `${backendBaseUrl}/api/leads/unsubscribe?email=${encodeURIComponent(cleanEmail)}`;

    if (config.autoSendWelcome) {
      try {
        const welcomeHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
            ${getEmailBrandHeader()}
            
            <div style="font-size: 15px; line-height: 1.6; color: #334155;">
              <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
                ${config.welcomeHeadline}
              </h2>

              <p style="margin-bottom: 14px;">
                Hi <strong>${lead.name || 'there'}</strong>,
              </p>

              <p style="margin-bottom: 20px; color: #475569;">
                ${config.welcomeMessage.replace(/\n/g, '<br>')}
              </p>

              <!-- Resource Download Cards -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 14px;">
                  🚀 Your Free Toolkit & Learning Resources:
                </h3>
                
                <div style="margin-bottom: 14px;">
                  <a href="${config.freeCourseUrl}" target="_blank" 
                     style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                    🎓 Access Free Courses & Lessons →
                  </a>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Explore our hands-on free AI tutorials and modules</div>
                </div>

                ${config.toolkitPdfUrl ? `
                <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
                  <a href="${config.toolkitPdfUrl}" target="_blank" 
                     style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    📥 Download Free AI Toolkit & Prompts (PDF) →
                  </a>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Top AI tools cheat sheet, curated prompts & study roadmap</div>
                </div>
                ` : ''}
              </div>

              <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                Have questions or need guidance? Simply reply to this email or reach us at <a href="mailto:support@widetech.in" style="color: #3b82f6;">support@widetech.in</a>.
              </p>
            </div>

            ${getEmailBrandFooter()}

            <!-- Unsubscribe Footer -->
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
              You received this email because you signed up for the Free AI Starter Toolkit on <a href="${frontendBaseUrl}" style="color: #64748b;">widetech.in</a>.<br>
              <a href="${unsubscribeLink}" style="color: #64748b; text-decoration: underline; margin-top: 6px; display: inline-block;">
                Unsubscribe from these emails anytime
              </a>
            </div>
          </div>
        `;

        await sendCustomEmail(
          cleanEmail,
          config.welcomeSubject,
          `${config.welcomeHeadline}\n\n${config.welcomeMessage}\n\nFree Courses: ${config.freeCourseUrl}\nToolkit PDF: ${config.toolkitPdfUrl}\n\nUnsubscribe: ${unsubscribeLink}`,
          welcomeHtml
        );

        lead.welcomeEmailSent = true;
        lead.welcomeEmailSentAt = new Date();
        await lead.save();
      } catch (mailErr) {
        console.warn('Welcome email dispatch skipped (SMTP fallback):', mailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed! Your Free AI Toolkit & Course access details have been emailed to your inbox.',
      alreadyExists: !isNewSubscriber
    });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// @desc    Handle one-click email unsubscribe
// @route   GET /api/leads/unsubscribe
// @access  Public
router.get('/unsubscribe', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('<h3>Invalid unsubscribe request: email parameter missing.</h3>');
  }

  try {
    const lead = await Lead.findOne({ email: email.toLowerCase().trim() });
    if (lead) {
      lead.isSubscribed = false;
      lead.unsubscribedAt = new Date();
      await lead.save();
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Unsubscribed - WIDETECHNOS Academy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px 28px; max-width: 460px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h2 { color: #38bdf8; margin-top: 0; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
          a { display: inline-block; margin-top: 18px; color: #fff; background: #3b82f6; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✓ You have been unsubscribed</h2>
          <p>Your email <strong>${email}</strong> has been removed from our active subscriber list. You will no longer receive newsletter announcements or promotional emails from WIDETECHNOS Academy.</p>
          <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}">Return to Academy Website</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).send('<h3>Error processing unsubscribe request.</h3>');
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

// ==================== SUBSCRIBERS & WELCOME EMAIL CONFIG (ADMIN) ====================

// @desc    Get all newsletter subscribers with stats
// @route   GET /api/leads/subscribers
// @access  Private/Admin
router.get('/subscribers', protect, admin, async (req, res) => {
  try {
    const subscribers = await Lead.find({}).sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    console.error('Fetch subscribers error:', error);
    res.status(500).json({ message: 'Failed to fetch subscribers', error: error.message });
  }
});

// @desc    Get Welcome Email Configuration
// @route   GET /api/leads/config
// @access  Private/Admin
router.get('/config', protect, admin, async (req, res) => {
  try {
    const config = await getOrInitNewsletterConfig();
    res.json(config);
  } catch (error) {
    console.error('Fetch newsletter config error:', error);
    res.status(500).json({ message: 'Failed to fetch config', error: error.message });
  }
});

// @desc    Update Welcome Email Configuration (Template, Links, PDF URL)
// @route   PUT /api/leads/config
// @access  Private/Admin
router.put('/config', protect, admin, async (req, res) => {
  const { welcomeSubject, welcomeHeadline, welcomeMessage, freeCourseUrl, toolkitPdfUrl, autoSendWelcome } = req.body;

  try {
    let config = await getOrInitNewsletterConfig();
    if (welcomeSubject !== undefined) config.welcomeSubject = welcomeSubject;
    if (welcomeHeadline !== undefined) config.welcomeHeadline = welcomeHeadline;
    if (welcomeMessage !== undefined) config.welcomeMessage = welcomeMessage;
    if (freeCourseUrl !== undefined) config.freeCourseUrl = freeCourseUrl;
    if (toolkitPdfUrl !== undefined) config.toolkitPdfUrl = toolkitPdfUrl;
    if (autoSendWelcome !== undefined) config.autoSendWelcome = Boolean(autoSendWelcome);
    config.updatedAt = new Date();

    await config.save();
    res.json({ success: true, message: 'Welcome email settings updated successfully!', config });
  } catch (error) {
    console.error('Update newsletter config error:', error);
    res.status(500).json({ message: 'Failed to update configuration', error: error.message });
  }
});

// @desc    Broadcast a custom email newsletter to all active subscribers
// @route   POST /api/leads/broadcast
// @access  Private/Admin
router.post('/broadcast', protect, admin, async (req, res) => {
  const { subject, bodyContent } = req.body;

  if (!subject || !bodyContent) {
    return res.status(400).json({ message: 'Subject and bodyContent are required.' });
  }

  try {
    const activeSubscribers = await Lead.find({ isSubscribed: true });
    if (activeSubscribers.length === 0) {
      return res.status(400).json({ message: 'No active subscribers found to broadcast to.' });
    }

    const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://widetech.in';

    let successCount = 0;
    for (const sub of activeSubscribers) {
      try {
        const unsubscribeLink = `${backendBaseUrl}/api/leads/unsubscribe?email=${encodeURIComponent(sub.email)}`;
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
            ${getEmailBrandHeader()}
            <div style="font-size: 15px; line-height: 1.6; color: #334155;">
              <p>Hi <strong>${sub.name || 'Student'}</strong>,</p>
              ${bodyContent.replace(/\n/g, '<br>')}
            </div>
            ${getEmailBrandFooter()}
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
              <a href="${unsubscribeLink}" style="color: #64748b; text-decoration: underline;">
                Unsubscribe from these emails anytime
              </a>
            </div>
          </div>
        `;

        await sendCustomEmail(sub.email, subject, bodyContent, emailHtml);
        successCount++;
      } catch (err) {
        console.warn(`Failed to send broadcast to ${sub.email}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Broadcast processed for ${activeSubscribers.length} subscribers (${successCount} dispatched successfully).`
    });
  } catch (error) {
    console.error('Broadcast email error:', error);
    res.status(500).json({ message: 'Broadcast failed', error: error.message });
  }
});

// @desc    Delete a subscriber
// @route   DELETE /api/leads/subscribers/:id
// @access  Private/Admin
router.delete('/subscribers/:id', protect, admin, async (req, res) => {
  try {
    const sub = await Lead.findByIdAndDelete(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: 'Subscriber not found.' });
    }
    res.json({ success: true, message: 'Subscriber removed successfully.' });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({ message: 'Failed to delete subscriber', error: error.message });
  }
});

export default router;
