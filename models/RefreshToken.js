/**
 * Refresh Token Model
 * Stores refresh tokens for token revocation and session management
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function () {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  revokedAt: {
    type: Date,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
});

// Index for auto-deletion of expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to revoke token
refreshTokenSchema.methods.revoke = function () {
  this.revoked = true;
  this.revokedAt = new Date();
  return this.save();
};

// Method to check if token is valid
refreshTokenSchema.methods.isValid = function () {
  return !this.revoked && new Date() < this.expiresAt;
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
