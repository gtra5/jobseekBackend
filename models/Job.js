const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer is required'],
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      maxlength: [2000, 'Job description cannot exceed 2000 characters'],
    },
    location: {
      type: String,
      trim: true,
    },
    jobType: {
      type: String,
      enum: {
        values: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'],
        message: '{VALUE} is not a valid job type',
      },
    },
    category: {
      type: String,
      required: [true, 'Job category is required'],
      enum: {
        values: [
          'Web Development',
          'Mobile Development',
          'UI/UX Design',
          'Data Science',
          'DevOps',
          'Cybersecurity',
          'Cloud Computing',
          'AI/ML',
          'Other',
        ],
        message: '{VALUE} is not a valid category',
      },
    },
    salary: {
      min: { type: Number, min: [0, 'Salary cannot be negative'] },
      max: { type: Number, min: [0, 'Salary cannot be negative'] },
      currency: { type: String, default: 'USD' },
    },
    skills: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Skill cannot exceed 50 characters'],
      },
    ],
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    experienceLevel: {
      type: String,
      enum: {
        values: ['Entry Level', 'Intermediate', 'Expert', 'Director'],
        message: '{VALUE} is not a valid experience level',
      },
    },
    educationLevel: {
      type: String,
      trim: true,
    },
    applicationDeadline: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt automatically
  }
);

// Index for better search performance
jobSchema.index({ title: 'text', description: 'text', skills: 'text' });
jobSchema.index({ category: 1 });
jobSchema.index({ isActive: 1, isDeleted: 1 });
jobSchema.index({ createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;