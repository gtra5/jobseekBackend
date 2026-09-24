/**
 * Application Model
 * Links Job Seekers to Jobs with application status tracking
 */

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
    },
    jobSeeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Job seeker reference is required'],
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer reference is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn', 'hired'],
      default: 'pending',
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
    },
    resumeSnapshot: {
      url: String,
      publicId: String,
    },
    answers: [
      {
        question: String,
        answer: String,
      },
    ],
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    interviews: [
      {
        scheduledAt: Date,
        duration: Number,
        type: {
          type: String,
          enum: ['phone', 'video', 'in-person'],
        },
        location: String,
        meetingLink: String,
        notes: String,
        status: {
          type: String,
          enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
          default: 'scheduled',
        },
        feedback: String,
      },
    ],
    employerNotes: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    isExternalJob: {
      type: Boolean,
      default: false,
    },
    externalJobId: {
      type: String,
      default: null,
    },
    externalSource: {
      type: String,
      default: null,
    },
    withdrawalReason: {
      type: String,
      trim: true,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
applicationSchema.index({ job: 1 });
applicationSchema.index({ jobSeeker: 1 });
applicationSchema.index({ employer: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ jobSeeker: 1, status: 1 });
applicationSchema.index({ employer: 1, status: 1 });
applicationSchema.index({ job: 1, jobSeeker: 1 }, { unique: true }); // One application per job per user

/**
 * Prevent duplicate applications
 */
applicationSchema.pre('save', async function () {
  if (this.isNew) {
    const existingApplication = await this.constructor.findOne({
      job: this.job,
      jobSeeker: this.jobSeeker,
      status: { $ne: 'withdrawn' },
    });
    if (existingApplication) {
      const error = new Error('You have already applied to this job');
      error.name = 'ValidationError';
      throw error;
    }
  }
});

/**
 * Update reviewedAt when status changes from pending
 */
applicationSchema.pre('save', function () {
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;