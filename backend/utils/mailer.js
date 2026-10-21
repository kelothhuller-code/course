import nodemailer from 'nodemailer';

const createTransporter = () => {
  // If SMTP configs are not defined, return a mock object that logs to console
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return {
      sendMail: async (mailOptions) => {
        console.log('================= MOCK EMAIL SENT =================');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Body:\n${mailOptions.text || mailOptions.html}`);
        console.log('===================================================');
        return { messageId: 'mock-id-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const getEmailBrandHeader = () => {
  const logoUrl = process.env.APP_LOGO_URL || '';
  return `
    <div style="text-align: center; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
      <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}" target="_blank" style="text-decoration: none; display: inline-block;">
        ${logoUrl ? `<img src="${logoUrl}" alt="WIDETECHNOS Academy" style="max-height: 48px; max-width: 200px; display: block; margin: 0 auto 10px auto;" />` : ''}
        <div style="display: inline-block; text-align: center;">
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">WIDETECHNOS</span>
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #8b5cf6; background: #f3e8ff; padding: 3px 8px; border-radius: 6px; margin-left: 6px; vertical-align: middle; letter-spacing: 1px;">ACADEMY</span>
        </div>
      </a>
    </div>
  `;
};

export const getEmailBrandFooter = () => {
  return `
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 16px 0;" />
    <div style="font-family: sans-serif; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;"><strong>WIDETECHNOS Academy</strong> • Vision by Instagram @widetechai</p>
      <p style="margin: 0;">Visit our platform at <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}" style="color: #6366f1; text-decoration: none;">widetech.in</a> | Building 1,000 AI Job Opportunities by 2027</p>
    </div>
  `;
};

export const sendRegistrationEmail = async (email, name) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"WIDETECHNOS Academy" <${process.env.SMTP_FROM || 'noreply@widetechnos.com'}>`,
    to: email,
    subject: 'Welcome to WIDETECHNOS AI Academy!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
        ${getEmailBrandHeader()}
        <h2 style="color: #8b5cf6; margin-top: 0;">Welcome to WIDETECHNOS, ${name}!</h2>
        <p style="color: #334155; line-height: 1.6;">Thank you for registering at our AI Academy. We are thrilled to guide you on your journey to mastering Generative AI!</p>
        <p style="color: #334155; line-height: 1.6;">Our vision is to build <strong>1,000 job opportunities by the end of 2027</strong> under the direction of Instagram founder <strong>@widetechai</strong>. We want to empower everyone from age 10 to older adults to build websites, mobile apps, software, and games with AI.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}/#courses" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 600; display: inline-block;">
            Explore Courses & Start Learning →
          </a>
        </div>
        ${getEmailBrandFooter()}
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Registration email dispatched: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending registration email:', error);
  }
};

export const sendPurchaseEmail = async (email, name, itemTitle, txnid, amount) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"WIDETECHNOS Academy" <${process.env.SMTP_FROM || 'noreply@widetechnos.com'}>`,
    to: email,
    subject: `Invoice: Enrollment Complete for ${itemTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
        ${getEmailBrandHeader()}
        <h2 style="color: #06b6d4; margin-top: 0;">Enrollment Confirmed!</h2>
        <p style="color: #334155; line-height: 1.6;">Hello ${name},</p>
        <p style="color: #334155; line-height: 1.6;">We have successfully processed your payment of <strong>₹${amount}</strong>. You now have full access to <strong>${itemTitle}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h4 style="margin: 0 0 12px 0; color: #1e293b;">Order Receipt Details:</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Item Name:</td>
              <td style="text-align: right; font-weight: bold; color: #1e293b;">${itemTitle}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Transaction ID:</td>
              <td style="text-align: right; font-family: monospace; color: #1e293b;">${txnid}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Amount Paid:</td>
              <td style="text-align: right; color: #06b6d4; font-weight: bold;">₹${amount}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Payment Gateway:</td>
              <td style="text-align: right; color: #64748b;">Razorpay Secured</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}/#dashboard" style="background: linear-gradient(135deg, #06b6d4, #0284c7); color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 600; display: inline-block;">
            Go to Your Dashboard →
          </a>
        </div>
        ${getEmailBrandFooter()}
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Purchase email dispatched: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending purchase email:', error);
  }
};

export const sendAccountCreatedWithPurchaseEmail = async (email, name, itemTitle, txnid, amount, tempPassword) => {
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'https://widetech.in';
  const mailOptions = {
    from: `"WIDETECHNOS Academy" <${process.env.SMTP_FROM || 'noreply@widetechnos.com'}>`,
    to: email,
    subject: `Your Account Details & Enrollment Confirmation for ${itemTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
        ${getEmailBrandHeader()}
        <h2 style="color: #4f46e5; margin-top: 0;">Welcome to WIDETECHNOS Academy! 🎉</h2>
        <p style="color: #334155; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
        <p style="color: #334155; line-height: 1.6;">
          Thank you for your purchase of <strong>₹${amount}</strong>! Your enrollment in <strong>${itemTitle}</strong> is active and ready.
        </p>
        
        <!-- Account Credentials Box -->
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin: 22px 0;">
          <h3 style="color: #3730a3; margin: 0 0 12px 0; font-size: 1.05rem;">🔑 Your New Account Credentials</h3>
          <p style="color: #4338ca; font-size: 0.88rem; margin: 0 0 12px 0; line-height: 1.5;">
            An account has been automatically created so you can access your purchased courses anytime from any device.
          </p>
          <div style="background: #ffffff; border-radius: 8px; padding: 12px 16px; border: 1px solid #e0e7ff; margin-bottom: 8px;">
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">Registered Email / Username:</div>
            <div style="font-size: 1rem; font-weight: 700; color: #1e293b; font-family: monospace;">${email}</div>
          </div>
          <div style="background: #ffffff; border-radius: 8px; padding: 12px 16px; border: 1px solid #e0e7ff;">
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">Generated Password:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #4f46e5; font-family: monospace; letter-spacing: 1px;">${tempPassword}</div>
          </div>
          <p style="font-size: 0.8rem; color: #64748b; margin: 10px 0 0 0; line-height: 1.4;">
            💡 <em>You can log in with this password immediately. If you forget your password in the future, simply click <strong>"Forgot Password"</strong> on our login page using your email.</em>
          </p>
        </div>

        <!-- Receipt Table -->
        <div style="background-color: #f8fafc; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h4 style="margin: 0 0 12px 0; color: #1e293b;">Order Receipt Details:</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Item Name:</td>
              <td style="text-align: right; font-weight: bold; color: #1e293b;">${itemTitle}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Transaction ID:</td>
              <td style="text-align: right; font-family: monospace; color: #1e293b;">${txnid}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Amount Paid:</td>
              <td style="text-align: right; color: #059669; font-weight: bold;">₹${amount}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0 14px 0;">
          <a href="${frontendUrl}/dashboard" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
            Access Your Course & Dashboard →
          </a>
        </div>

        ${getEmailBrandFooter()}
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Account creation + purchase email dispatched: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending account creation email:', error);
  }
};

// Accepts either an options object ({ to, subject, html, text, replyTo }) or the positional form
// (to, subject, text, html). Several routes (lead welcome email, admin inquiry replies,
// newsletter broadcast) call it positionally — previously that destructured a string, so
// `to` was undefined and those emails silently never went out.
export const sendCustomEmail = async (toOrOptions, subjectArg, textArg, htmlArg) => {
  const opts = (toOrOptions && typeof toOrOptions === 'object')
    ? toOrOptions
    : { to: toOrOptions, subject: subjectArg, text: textArg, html: htmlArg };
  const { to, subject, html, text, replyTo } = opts;
  if (!to) {
    throw new Error('sendCustomEmail: missing recipient');
  }
  const transporter = createTransporter();
  const mailOptions = {
    from: `"WIDETECHNOS Academy" <${process.env.SMTP_FROM || 'noreply@widetechnos.com'}>`,
    to,
    subject,
    ...(replyTo ? { replyTo } : {}),
    text: text || '',
    html: html || `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
        ${getEmailBrandHeader()}
        <div style="font-size: 15px; line-height: 1.6; color: #334155; margin: 16px 0;">
          ${(text || '').replace(/\n/g, '<br>')}
        </div>
        ${getEmailBrandFooter()}
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

export const verifySmtpConnection = async () => {
  const transporter = createTransporter();
  if (typeof transporter.verify === 'function') {
    return new Promise((resolve) => {
      transporter.verify((error, success) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }
  return { success: true, mock: true };
};

