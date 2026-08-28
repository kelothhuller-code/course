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

export const sendRegistrationEmail = async (email, name) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"WIDETECHNOS Academy" <${process.env.SMTP_FROM || 'noreply@widetechnos.com'}>`,
    to: email,
    subject: 'Welcome to WIDETECHNOS AI Academy!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #8b5cf6;">Welcome to WIDETECHNOS, ${name}!</h2>
        <p>Thank you for registering at our AI Academy. We are thrilled to guide you on your journey to mastering Generative AI!</p>
        <p>Our vision is to build <strong>1,000 job opportunities by the end of 2027</strong> under the direction of Instagram founder <strong>@videdreamer</strong>. We want to empower everyone from age 10 to older adults to build websites, mobile apps, software, and games with AI.</p>
        <p>Log in to your Dashboard to browse courses, webinars, and start learning!</p>
        <br />
        <p>Best regards,</p>
        <p><strong>The WIDETECHNOS Team</strong></p>
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
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #06b6d4;">Enrollment Confirmed!</h2>
        <p>Hello ${name},</p>
        <p>We have successfully processed your payment of <strong>₹${amount}</strong>. You now have full access to <strong>${itemTitle}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Order Receipt Details:</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Item Name:</td>
              <td style="text-align: right; font-weight: bold;">${itemTitle}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Transaction ID:</td>
              <td style="text-align: right; font-family: monospace;">${txnid}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Amount Paid:</td>
              <td style="text-align: right; color: #06b6d4; font-weight: bold;">₹${amount}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Payment Gateway:</td>
              <td style="text-align: right;">PayU Sandbox</td>
            </tr>
          </table>
        </div>

        <p>Please head over to your Dashboard to begin studying or join the live event meeting room.</p>
        <br />
        <p>Let's build the future together,</p>
        <p><strong>The WIDETECHNOS Academy Team (Vision by @videdreamer)</strong></p>
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
