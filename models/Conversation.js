/**
 * Conversation Model
 * Represents a 1-on-1 chat thread between an employer and a job seeker.
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // The two participants in this thread.
    // Order is not significant; queries use the participant index.
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // Optional job context that this conversation is related to.
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    // Denormalised reference to the last message for list previews.
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index participants so we can find a thread by the two users involved.
conversationSchema.index({ participants: 1 });
// Unique on the pair of participants + optional job.
conversationSchema.index(
  { participants: 1, job: 1 },
  { unique: true, partialFilterExpression: { job: { $type: 'objectId' } } }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
