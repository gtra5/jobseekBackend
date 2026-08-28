const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const OTP = require('../models/OTP');
const { logAuthEvent } = require('../utils/logger');

class OTPService {
  constructor() {
    this._transporter = null;
  }

  get transporter() {
    if (!this._transporter) {
      const user = process.env.EMAIL_USER;
      // Gmail app passwords are often copied with spaces — strip them
      const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

      if (!user || !pass) {
        // Return null instead of throwing so callers can handle gracefully
        return null;
      }

      this._transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    }
    return this._transporter;
  }

  /**
   * Generate a secure 6-digit numeric OTP
   * @returns {string}
   */
  generateOTP() {
    return otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });
  }

  /**
   * Send OTP via email
   * @param {string} email - Recipient email address
   * @param {string} otp  - The OTP to send
   * @param {string} purpose - Purpose of OTP
   * @returns {Promise<boolean>}
   */
  async sendOTP(email, otp, purpose) {
    try {
      console.log('Attempting to send OTP email to:', email);
      console.log('EMAIL_USER configured:', !!process.env.EMAIL_USER);
      console.log('EMAIL_PASS configured:', !!process.env.EMAIL_PASS);

      // If email credentials aren't set, log a warning and skip sending.
      const transporter = this.transporter;
      if (!transporter) {
        console.warn(
          '[OTP] EMAIL_USER / EMAIL_PASS not configured — skipping email send. ' +
          'Set EMAIL_USER and EMAIL_PASS in your environment variables.'
        );
        return true;
      }

      const subjects = {
        registration:       'JobSeek – Your Registration Code',
        login:              'JobSeek – Your Login Code',
        password_reset:     'JobSeek – Your Password Reset Code',
        email_verification: 'JobSeek – Verify Your Email',
      };

      const subject = subjects[purpose] || 'JobSeek – Your Verification Code';

      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;
                    background:#0f0f1a;color:#fff;border-radius:12px;">
          <h2 style="color:#6857F6;margin-bottom:8px;">JobSeek</h2>
          <p style="color:#ccc;margin-bottom:24px;">
            Use the code below to complete your ${purpose.replace('_', ' ')}.
            It expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#1a1a2e;border:1px solid #6857F6;border-radius:8px;
                      padding:24px;text-align:center;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;
                         color:#A549E2;">${otp}</span>
          </div>
          <p style="color:#666;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.
            Never share this code with anyone.
          </p>
        </div>
      `;

      // Verify transporter before sending
      console.log('Getting email transporter...');
      console.log('Transporter created successfully');

      const info = await transporter.sendMail({
        from: `"JobSeek" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });

      console.log(`OTP email sent to ${email}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Error sending OTP email — full error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
      });
      
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS in .env. For Gmail, use an App Password instead of your regular password.');
      }
      
      throw new Error(error.message || 'Failed to send OTP email. Please try again.');
    }
  }

  /**
   * Create and store OTP in database
   * @param {string} email   - Recipient email address
   * @param {string} purpose - Purpose of OTP
   * @param {Object} [pendingData] - Optional payload to store alongside the OTP
   *                                 (used for registration to hold pre-verified user data)
   * @returns {Promise<string>} The plain-text OTP (before hashing)
   */
  async createOTP(email, purpose, pendingData = null) {
    try {
      const otp = this.generateOTP();

      // Remove any existing unverified OTPs for this email + purpose
      await OTP.deleteMany({ email, purpose, isVerified: false });

      const otpRecord = new OTP({ email, otp, purpose, pendingData });
      await otpRecord.save();

      return otp;
    } catch (error) {
      console.error('Error creating OTP:', error);
      throw new Error('Failed to generate OTP. Please try again.');
    }
  }

  /**
   * Verify OTP
   * @param {string} email   - Email address
   * @param {string} otp     - OTP to verify
   * @param {string} purpose - Purpose of OTP
   * @returns {Promise<OTPDocument>} The verified OTP document (contains pendingData if present)
   */
  async verifyOTP(email, otp, purpose) {
    try {
      const otpRecord = await OTP.findOne({
        email,
        purpose,
        isVerified: false,
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        throw new Error('OTP not found or expired. Please request a new one.');
      }

      if (otpRecord.isExpired()) {
        throw new Error('OTP has expired. Please request a new one.');
      }

      if (otpRecord.maxAttemptsReached()) {
        throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      }

      otpRecord.attempts += 1;

      const isMatch = await otpRecord.compareOTP(otp);
      if (!isMatch) {
        await otpRecord.save();
        logAuthEvent.otpFailed(email, purpose, 'Unknown', 'Invalid OTP');
        throw new Error('Invalid OTP. Please try again.');
      }

      otpRecord.isVerified = true;
      await otpRecord.save();

      logAuthEvent.otpVerified(email, purpose, 'Unknown');

      // Return the full record so callers can access pendingData
      return otpRecord;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Generate and send OTP
   * @param {string} userId      - User ID (may be null for pre-registration)
   * @param {string} email       - Recipient email address
   * @param {string} purpose     - OTP purpose
   * @param {string} [ip]        - Request IP address
   * @param {Object} [pendingData] - Optional data to store in the OTP record
   * @returns {Promise<string>} The plain-text OTP
   */
  async generateAndSendOTP(userId, email, purpose, ip, pendingData = null) {
    try {
      const otp = await this.createOTP(email, purpose, pendingData);
      await this.sendOTP(email, otp, purpose);

      logAuthEvent.otpRequested(email, purpose, ip);

      return otp;
    } catch (error) {
      console.error('Error generating and sending OTP:', error);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs (call periodically if needed)
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteMany({ expiresAt: { $lt: new Date() } });
      console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }
}

module.exports = new OTPService();