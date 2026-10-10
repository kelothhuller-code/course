import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const targetEmail = process.argv[2] || process.env.SMTP_USER;

console.log('\n======================================================');
console.log('       📧 WIDETECHNOS Academy - SMTP Test Tool');
console.log('======================================================');
console.log(`SMTP Host:     ${process.env.SMTP_HOST || '(NOT SET)'}`);
console.log(`SMTP Port:     ${process.env.SMTP_PORT || '587'}`);
console.log(`SMTP Secure:   ${process.env.SMTP_SECURE || 'false'}`);
console.log(`SMTP User:     ${process.env.SMTP_USER || '(NOT SET)'}`);
console.log(`SMTP Pass:     ${process.env.SMTP_PASS ? '******** (configured)' : '(NOT SET)'}`);
console.log(`From Header:   ${process.env.SMTP_FROM || '(NOT SET)'}`);
console.log(`Target Email:  ${targetEmail || '(NOT SET)'}`);
console.log('======================================================\n');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('⚠️  Notice: SMTP credentials are not fully set in backend/.env.');
  console.log('   The system will use MOCK mode (logging emails to console instead of sending real emails).');
  console.log('   To send real emails via Brevo:');
  console.log('   1. Sign up at https://brevo.com (free 300 emails/day)');
  console.log('   2. Go to "Transactional" -> "Settings" -> "SMTP & API"');
  console.log('   3. Set the following in your backend/.env:');
  console.log('      SMTP_HOST=smtp-relay.brevo.com');
  console.log('      SMTP_PORT=587');
  console.log('      SMTP_USER=your-brevo-login@email.com');
  console.log('      SMTP_PASS=your-brevo-smtp-key');
  console.log('      SMTP_FROM="WIDETECHNOS Academy" <your-verified-brevo-sender@email.com>');
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log('🔄 Step 1: Testing SMTP connection...');
transporter.verify(async (error, success) => {
  if (error) {
    console.error('❌ Connection Failed! Error details:');
    console.error(error.message);
    console.log('\n💡 Troubleshooting Tips:');
    if (error.code === 'EAUTH') {
      console.log('- Authentication failed: check your SMTP_USER and SMTP_PASS in backend/.env');
      console.log('- On Brevo, SMTP_PASS must be an SMTP key created under SMTP & API, not your account login password.');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      console.log('- Network timeout: check port (try 587 with SMTP_SECURE=false, or 465 with SMTP_SECURE=true).');
    }
    process.exit(1);
  }

  console.log('✅ SMTP Connection verified successfully!\n');

  if (!targetEmail) {
    console.log('ℹ️  No recipient email provided. To send a test email, run:');
    console.log('   node backend/test-mail.js recipient@example.com\n');
    process.exit(0);
  }

  console.log(`📤 Step 2: Sending test email to ${targetEmail}...`);
  try {
    const logoUrl = process.env.APP_LOGO_URL || '';
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"WIDETECHNOS Academy" <${process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: '🎉 Test Email: WIDETECHNOS Academy Mailer Active!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
            <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}" target="_blank" style="text-decoration: none; display: inline-block;">
              ${logoUrl ? `<img src="${logoUrl}" alt="WIDETECHNOS Academy" style="max-height: 48px; max-width: 200px; display: block; margin: 0 auto 10px auto;" />` : ''}
              <div style="display: inline-block; text-align: center;">
                <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">WIDETECHNOS</span>
                <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #8b5cf6; background: #f3e8ff; padding: 3px 8px; border-radius: 6px; margin-left: 6px; vertical-align: middle; letter-spacing: 1px;">ACADEMY</span>
              </div>
            </a>
          </div>
          <h2 style="color: #10b981; margin-top: 0;">🎉 SMTP Connection Successful!</h2>
          <p style="color: #334155; line-height: 1.6;">This is a test email sent from your <strong>WIDETECHNOS Academy</strong> backend.</p>
          <div style="background: #f8fafc; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 16px 0; border: 1px solid #e2e8f0;">
            Host: ${process.env.SMTP_HOST}<br />
            Port: ${process.env.SMTP_PORT || '587'}<br />
            From: ${process.env.SMTP_FROM || 'noreply'}<br />
            Dispatched at: ${new Date().toISOString()}
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.6;">
            Your automated emails (course purchase receipts, student registration welcomes, and announcement broadcasts) are active and ready!
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 16px 0;" />
          <div style="font-family: sans-serif; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
            <p style="margin: 0 0 6px 0;"><strong>WIDETECHNOS Academy</strong> • Vision by Instagram @widetechai</p>
            <p style="margin: 0;">Visit our platform at <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}" style="color: #6366f1; text-decoration: none;">widetech.in</a></p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Test email successfully sent!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Check inbox/spam of ${targetEmail}.\n`);
  } catch (sendErr) {
    console.error('❌ Failed to send email:');
    console.error(sendErr.message);
  }
});
