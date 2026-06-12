const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email notification
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Smart Complaint System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    // Non-blocking — don't throw, just log
  }
};

/**
 * Send complaint submission confirmation
 */
const sendComplaintConfirmation = async (userEmail, userName, complaintTitle) => {
  await sendEmail({
    to: userEmail,
    subject: '✅ Complaint Received — Smart Complaint System',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9fafb;border-radius:8px;">
        <h2 style="color:#1e40af;">Complaint Received Successfully</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your complaint titled <strong>"${complaintTitle}"</strong> has been received and is currently under review.</p>
        <p>Our team will process it shortly. You can track its status in your dashboard.</p>
        <br/>
        <p style="color:#6b7280;font-size:12px;">Smart Complaint Management System — SZABIST</p>
      </div>
    `,
  });
};

/**
 * Send status update notification
 */
const sendStatusUpdate = async (userEmail, userName, complaintTitle, newStatus) => {
  const statusColors = {
    pending: '#f59e0b',
    'in-progress': '#3b82f6',
    resolved: '#10b981',
    rejected: '#ef4444',
  };
  const color = statusColors[newStatus] || '#6b7280';

  await sendEmail({
    to: userEmail,
    subject: `🔔 Complaint Status Updated — ${complaintTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9fafb;border-radius:8px;">
        <h2 style="color:#1e40af;">Complaint Status Updated</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your complaint <strong>"${complaintTitle}"</strong> status has been updated to:</p>
        <p style="display:inline-block;padding:6px 16px;border-radius:20px;background:${color};color:#fff;font-weight:bold;text-transform:uppercase;">${newStatus}</p>
        <p>Log in to your dashboard to view details.</p>
        <br/>
        <p style="color:#6b7280;font-size:12px;">Smart Complaint Management System — SZABIST</p>
      </div>
    `,
  });
};

/**
 * Send assignment notification to staff
 */
const sendAssignmentNotification = async (staffEmail, staffName, complaintTitle) => {
  await sendEmail({
    to: staffEmail,
    subject: `📋 New Complaint Assigned — ${complaintTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9fafb;border-radius:8px;">
        <h2 style="color:#1e40af;">New Complaint Assigned to You</h2>
        <p>Dear <strong>${staffName}</strong>,</p>
        <p>A new complaint has been assigned to you: <strong>"${complaintTitle}"</strong>.</p>
        <p>Please log into the Staff Panel to review and take action.</p>
        <br/>
        <p style="color:#6b7280;font-size:12px;">Smart Complaint Management System — SZABIST</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendComplaintConfirmation,
  sendStatusUpdate,
  sendAssignmentNotification,
};
