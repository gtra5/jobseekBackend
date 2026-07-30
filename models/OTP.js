const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address',
    },
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    trim: true,
  },
  purpose: {
    type: String,
    required: [true, 'Purpose is required'],
    enum: {
      values: ['registration', 'login', 'password_reset', 'email_verification'],
      message: '{VALUE} is not a valid purpose',
    },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum verification attempts exceeded'],
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    default: function () {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient lookups and auto-delete of expired docs
otpSchema.index({ email: 1, purpose: 1, isVerified: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

otpSchema.methods.maxAttemptsReached = function () {
  return this.attempts >= 3;
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
