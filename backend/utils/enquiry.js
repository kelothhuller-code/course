import mongoose from 'mongoose';
import { sendCustomEmail } from './mailer.js';

export const ENQUIRY_INTERESTS = ['Course', 'Software', 'Service', 'Other'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const isValidObjectId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);

/**
 * Validate & normalise public enquiry input. Returns { data } or { error }.
 * `requireMessage` is false for the software/service modals where "requirements" is optional.
 */
export const validateEnquiry = (body = {}, { requireMessage = true } = {}) => {
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const message = str(body.message);
  const interest = ENQUIRY_INTERESTS.includes(body.interest) ? body.interest : 'Other';

  if (!name || name.length > 100) return { error: 'Please provide your name (max 100 characters).' };
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return { error: 'Please provide a valid email address.' };
  if (phone && !PHONE_RE.test(phone)) return { error: 'Please provide a valid phone number, or leave it blank.' };
  if (requireMessage && message.length < 2) return { error: 'Please include a short message.' };
  if (message.length > 5000) return { error: 'Message is too long (max 5000 characters).' };

  return { data: { name, email, phone, message, interest } };
};

/** Honeypot: hidden "website" field that only bots fill in. */
export const isLikelySpam = (body = {}) => typeof body.website === 'string' && body.website.trim() !== '';

/**
 * Email the owner about a new enquiry. Configure with:
 *   ENQUIRY_NOTIFY_EMAIL  comma-separated recipient(s) (required to enable)
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM (existing SMTP settings)
 * Never throws — enquiry storage must not fail because email is down.
 */
export const notifyNewEnquiry = async (enquiry) => {
  const to = (process.env.ENQUIRY_NOTIFY_EMAIL || '').trim();
  if (!to) {
    console.log(`📬 New enquiry from ${enquiry.email} (${enquiry.subject}) — set ENQUIRY_NOTIFY_EMAIL to receive these by email.`);
    return false;
  }
  try {
    const adminPath = (process.env.ADMIN_SECRET_PATH || 'wide-hq-portal').replace(/^\/+|\/+$/g, '');
    const siteUrl = (process.env.FRONTEND_URL || 'https://widetech.in').replace(/\/+$/, '');
    const rows = [
      ['Interest', enquiry.interest],
      ['Subject', enquiry.subject],
      ['Name', enquiry.name],
      ['Email', enquiry.email],
      ['Phone', enquiry.phone || '—'],
      ['Source', enquiry.source || '—'],
      ...(enquiry.categoryLabel ? [['Category', enquiry.categoryLabel]] : []),
      ...(enquiry.priority ? [['Priority', `${enquiry.priority} (score ${enquiry.score ?? 0})`]] : []),
      ...(enquiry.company ? [['Company', enquiry.company]] : []),
      ...(enquiry.country ? [['Country', enquiry.country]] : []),
      ...(enquiry.relatedTitle ? [['Product', enquiry.relatedTitle]] : []),
      // Detailed answers from the smart business enquiry form
      ...((enquiry.answers || []).map((a) => [a.label, a.value])),
    ];
    const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nMessage:\n${enquiry.message}\n\nView all enquiries: ${siteUrl}/${adminPath}/ (Inquiries tab)`;
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="margin:0 0 12px 0;color:#0f172a;">📬 New ${escapeHtml(enquiry.interest)} enquiry</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;color:#64748b;width:140px;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 8px;color:#0f172a;">${escapeHtml(v)}</td></tr>`).join('')}
        </table>
        <div style="margin-top:14px;padding:12px 14px;background:#f8fafc;border-left:4px solid #4f46e5;border-radius:6px;font-size:14px;color:#334155;white-space:pre-wrap;">${escapeHtml(enquiry.message)}</div>
        <p style="font-size:12px;color:#64748b;margin-top:16px;">Reply directly to this email to answer ${escapeHtml(enquiry.name)}, or open the admin portal → Inquiries.</p>
      </div>`;
    await sendCustomEmail({
      to,
      subject: `New ${enquiry.interest} enquiry from ${enquiry.name}`,
      text,
      html,
      replyTo: enquiry.email,
    });
    return true;
  } catch (err) {
    console.warn('Enquiry notification email failed (enquiry was still saved):', err.message);
    return false;
  }
};
