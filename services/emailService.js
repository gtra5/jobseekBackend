/**
 * Email Service
 * Handles sending emails for verification, notifications, etc.
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @returns {Promise} Email send result
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Jobseek" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} type - OTP type (email_verification, password_reset)
 */
const sendOTPEmail = async (email, otp, type) => {
  const subject = type === 'email_verification' ? 'Verify Your Email' : 'Reset Your Password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          color: #4a90e2;
          letter-spacing: 5px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4a90e2;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${subject}</h2>
        <p>Your verification code is:</p>
        <div class="otp">${otp}</div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Jobseek. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 */
const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Jobseek</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4a90e2;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome to Jobseek!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for joining Jobseek. We're excited to help you find your dream job or connect with talented candidates.</p>
        <p>Please verify your email address to get started.</p>
        <a href="${process.env.FRONTEND_URL}/verify-email" class="button">Verify Email</a>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Jobseek. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Jobseek!',
    html,
  });
};

/**
 * Send application status update email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} jobTitle - Job title
 * @param {string} status - Application status
 */
const sendApplicationStatusEmail = async (email, name, jobTitle, status) => {
  const statusMessages = {
    reviewed: 'Your application has been reviewed.',
    shortlisted: 'Congratulations! You have been shortlisted for the position.',
    interview: 'You have been selected for an interview.',
    offered: 'Congratulations! You have received a job offer.',
    rejected: 'Unfortunately, your application was not successful.',
  };

  const message = statusMessages[status] || 'Your application status has been updated.';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Status Update</title>
      <style>
        body.
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 30px;
        text-align: center;
      }
      .status {
        font-size: 24px;
        font-weight: bold;
        color: #4a90e2;
        margin: 20px 0;
        text-transform: capitalize;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #4a90e2;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin-top: 20px;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #666;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <h2>Application Status Update</h2>
        <p>Hi ${name},</p>
        <p>Your application for <strong>${jobTitle}</strong> has been updated.</p>
        <div class="status">${status}</div>
        <p>${message}</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/applications" class="button">View Applications</a>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Jobseek. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Application Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    html,
  });
};

/**
 * Send interview scheduled email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} jobTitle - Job title
 * @param {Date} interviewDate - Interview date
 * @param {string} interviewType - Interview type
 */
const sendInterviewEmail = async (email, name, jobTitle, interviewDate, interviewType) => {
  const formattedDate = new Date(interviewDate).toLocaleString();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Interview Scheduled</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
        }
        .details {
          background-color: white;
          padding: 20px;
          border-radius: 4px;
          margin: 20px 0;
          text-align: left;
        }
        .details p {
          margin: 10px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4a90e2;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Interview Scheduled</h2>
        <p>Hi ${name},</p>
        <p>You have an interview scheduled for <strong>${jobTitle}</strong>.</p>
        <div class="details">
          <p><strong>Date & Time:</strong> ${formattedDate}</p>
          <p><strong>Type:</strong> ${interviewType}</p>
        </div>
        <p>Please make sure to prepare for the interview and be available at the scheduled time.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/applications" class="button">View Interview Details</a>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Jobseek. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Interview Scheduled',
    html,
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
  sendInterviewEmail,
};
