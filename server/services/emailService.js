// server/services/emailService.js
// Central email helper — all routes call sendEmail() from here.
// Swap the transporter config below to switch from Gmail to SendGrid.

const nodemailer = require('nodemailer');

// ── Transporter (created once, reused for every send) ────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── sendEmail ────────────────────────────────────────────────────────────
// to      — recipient email address (string)
// subject — email subject line (string)
// html    — full HTML body (string, use inline CSS only)

async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EMAIL] EMAIL_USER or EMAIL_PASS not set — skipping send.');
    return;
  }

  const mailOptions = {
    from: `"Campus Event Board" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent to ${to} — ${info.messageId}`);
  } catch (err) {
    // Log the failure but NEVER throw — a failed email must not crash a route.
    console.error(`[EMAIL] Failed to send to ${to}:`, err.message);
  }
}

module.exports = { sendEmail };