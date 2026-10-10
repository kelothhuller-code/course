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

export const sendCustomEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"WIDETECHNOS Academy" <${process.env.SMTP_FROM || 'noreply@widetechnos.com'}>`,
    to,
    subject,
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

