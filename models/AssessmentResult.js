/**
 * AssessmentResult Model
 * Records a freelancer's attempt on a skill assessment and the score earned.
 * Stores the best score per (user, skillCategory) so rankings stay simple.
 */

const mongoose = require('mongoose');

const answerSnapshotSchema = new mongoose.Schema(
  {
    question: String,
    chosenIndex: Number,
    correctIndex: Number,
    isCorrect: Boolean,
  },
  { _id: false }
);

const assessmentResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
    },
    skillCategory: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    passed: {
      type: Boolean,
      default: false,
    },
    answers: [answerSnapshotSchema],
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    isBest: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Only one "best" result per user per category
assessmentResultSchema.index({ user: 1, skillCategory: 1, isBest: 1 });
// For ranking within a category
assessmentResultSchema.index({ skillCategory: 1, score: -1 });

const AssessmentResult = mongoose.model('AssessmentResult', assessmentResultSchema);

module.exports = AssessmentResult;
