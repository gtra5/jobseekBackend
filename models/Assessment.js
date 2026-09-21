/**
 * Assessment Model
 * A curated multiple-choice assessment bank per skill category.
 * Freelancers take these to earn a "verified" competency score.
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: (opts) => Array.isArray(opts) && opts.length >= 2,
        message: 'Each question needs at least two options',
      },
    },
    correctIndex: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: [0, 'correctIndex cannot be negative'],
    },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    skillCategory: {
      type: String,
      required: [true, 'Skill category is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    passScore: {
      type: Number,
      default: 70,
      min: [0, 'passScore cannot be negative'],
      max: [100, 'passScore cannot exceed 100'],
    },
    timeLimitMinutes: {
      type: Number,
      default: 10,
      min: [1, 'timeLimitMinutes must be at least 1'],
    },
    questions: {
      type: [questionSchema],
      required: [true, 'Assessment needs at least one question'],
      validate: {
        validator: (qs) => qs.length > 0,
        message: 'Assessment needs at least one question',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique assessment per category per difficulty level
assessmentSchema.index({ skillCategory: 1, difficulty: 1 }, { unique: true });

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;
