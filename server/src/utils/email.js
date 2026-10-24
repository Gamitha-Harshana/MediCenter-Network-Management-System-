const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend.
 * @param {string} to      - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html    - HTML body content
 */
const sendEmail = async (to, subject, html) => {
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MCNMS <onboarding@resend.dev>',
      to,
      subject,
      html
    });

    if (error) {
      console.error('Resend email error:', error.message);
    }
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

module.exports = { sendEmail };
