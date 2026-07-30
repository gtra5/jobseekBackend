/**
 * Notification Model
 * Stores user notifications for job alerts, application updates, etc.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type: String,
      enum: [
        'job_alert',
        'application_received',
        'application_status',
        'interview_scheduled',
        'job_offer',
        'application_rejected',
        'profile_view',
        'message',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    // Reference to related entity (job, application, etc.)
    relatedEntity: {
      type: {
        type: String,
        enum: ['job', 'application', 'interview', 'message', 'user'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    // Action URL for the notification
    actionUrl: {
      type: String,
      trim: true,
    },
    // Notification metadata
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Email sent status
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    // Push notification sent status
    pushSent: {
      type: Boolean,
      default: false,
    },
    pushSentAt: {
      type: Date,
      default: null,
    },
    // Expiration for time-sensitive notifications
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Mark notification as unread
 */
notificationSchema.methods.markAsUnread = async function () {
  if (this.isRead) {
    this.isRead = false;
    this.readAt = null;
    await this.save();
  }
  return this;
};

/**
 * Check if notification is expired
 */
notificationSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
