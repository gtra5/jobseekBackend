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
    // Application cover letter/message
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
    },
    // Resume snapshot at time of application
    resumeSnapshot: {
      url: String,
      publicId: String,
    },
    // Additional answers to job-specific questions
    answers: [
      {
        question: String,
        answer: String,
      },
    ],
    // Application metadata
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // Interview scheduling
    interviews: [
      {
        scheduledAt: Date,
        duration: Number, // in minutes
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
    // Employer notes (internal)
    employerNotes: {
      type: String,
      trim: true,
    },
    // Rating by employer (1-5)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    // External job tracking (for aggregated jobs)
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
    // Withdrawal reason
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
applicationSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existingApplication = await this.constructor.findOne({
      job: this.job,
      jobSeeker: this.jobSeeker,
      status: { $ne: 'withdrawn' },
    });
    if (existingApplication) {
      const error = new Error('You have already applied to this job');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

/**
 * Update reviewedAt when status changes from pending
 */
applicationSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
