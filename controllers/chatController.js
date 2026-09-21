/**
 * Chat Controller
 * Handles employer <-> job seeker conversations and messages.
 * All endpoints require authentication and restrict users to their own threads.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Resolve a Conversation and ensure the requesting user is a participant.
 * @returns {Promise<Conversation|null>}
 */
const getOwnedConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  return isParticipant ? conversation : false;
};

/**
 * GET /api/chat/conversations
 * List conversations for the current user (with the other party populated
 * and an unread count).
 * @access Private
 */
const getMyConversations = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'firstName lastName email avatar role company')
    .populate('job', 'title')
    .populate('lastMessage', 'content sender createdAt readAt')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  // Count unread messages per conversation.
  const ids = conversations.map((c) => c._id);
  let unreadByConv = {};
  if (ids.length) {
    const unread = await Message.aggregate([
      { $match: { conversation: { $in: ids }, sender: { $ne: userId } } },
      { $match: { readBy: { $ne: userId } } },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]);
    unread.forEach((u) => { unreadByConv[u._id.toString()] = u.count; });
  }

  const result = conversations.map((conv) => {
    const other = conv.participants.find((p) => p._id.toString() !== userId);
    return {
      id: conv._id,
      job: conv.job,
      participants: conv.participants,
      other: other || null,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt || conv.updatedAt,
      unreadCount: unreadByConv[conv._id.toString()] || 0,
      updatedAt: conv.updatedAt,
    };
  });

  return ApiResponse.success(res, 200, 'Conversations retrieved successfully', {
    conversations: result,
  });
});

/**
 * POST /api/chat/conversations
 * Get (if exists) or create a conversation with another user.
 * Body: { userId, jobId? }
 * @access Private
 */
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { userId: otherUserId, jobId } = req.body;

  if (!otherUserId) {
    return ApiResponse.badRequest(res, 'Conversation partner (userId) is required');
  }
  if (otherUserId === userId) {
    return ApiResponse.badRequest(res, 'You cannot start a conversation with yourself');
  }

  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    return ApiResponse.notFound(res, 'User not found');
  }

  const participants = [userId, otherUserId].sort();
  const query = { participants };
  if (jobId) query.job = jobId;

  let conversation = await Conversation.findOne(query);
  if (!conversation) {
    conversation = await Conversation.create({
      participants,
      ...(jobId ? { job: jobId } : {}),
    });
  }

  await conversation.populate('participants', 'firstName lastName email avatar role company');
  if (jobId) await conversation.populate('job', 'title');

  const other = conversation.participants.find((p) => p._id.toString() !== userId);

  return ApiResponse.success(res, 200, 'Conversation ready', {
    conversation: {
      id: conversation._id,
      job: conversation.job,
      participants: conversation.participants,
      other: other,
      lastMessage: null,
      unreadCount: 0,
    },
  });
});

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get messages for a conversation.
 * Query: ?before=<messageId>&limit=50 (older pagination)
 * @access Private (participant only)
 */
const getMessages = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.params;
  const { before, limit = 50 } = req.query;

  const conversation = await getOwnedConversation(conversationId, userId);
  if (!conversation) {
    return ApiResponse.notFound(res, 'Conversation not found');
  }
  if (conversation === false) {
    return ApiResponse.forbidden(res, 'You are not part of this conversation');
  }

  const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
  const query = { conversation: conversationId };
  if (before) query._id = { $lt: before };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .populate('sender', 'firstName lastName avatar role');

  // Mark every message in this thread as read by the current user.
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId }, $set: { readAt: new Date() } }
  );

  const flat = messages.map((m) => ({
    id: m._id,
    conversation: m.conversation,
    sender: m.sender,
    content: m.content,
    readBy: m.readBy,
    readAt: m.readAt,
    createdAt: m.createdAt,
  }));

  // Return ascending so the UI can append.
  flat.reverse();

  return ApiResponse.success(res, 200, 'Messages retrieved successfully', {
    messages: flat,
  });
});

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a message.
 * Body: { content }
 * @access Private (participant only)
 */
const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return ApiResponse.badRequest(res, 'Message content is required');
  }

  const conversation = await getOwnedConversation(conversationId, userId);
  if (!conversation) {
    return ApiResponse.notFound(res, 'Conversation not found');
  }
  if (conversation === false) {
    return ApiResponse.forbidden(res, 'You are not part of this conversation');
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    content: content.trim(),
    readBy: [userId],
  });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  await message.populate('sender', 'firstName lastName avatar role');

  return ApiResponse.created(res, 'Message sent', {
    message: {
      id: message._id,
      conversation: message.conversation,
      sender: message.sender,
      content: message.content,
      readBy: message.readBy,
      createdAt: message.createdAt,
    },
    conversation: {
      id: conversation._id,
      lastMessage: message._id,
      lastMessageAt: message.createdAt,
    },
  });
});

/**
 * PUT /api/chat/conversations/:conversationId/read
 * Mark all unread messages as read for the current user.
 * @access Private (participant only)
 */
const markRead = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.params;

  const conversation = await getOwnedConversation(conversationId, userId);
  if (!conversation) {
    return ApiResponse.notFound(res, 'Conversation not found');
  }
  if (conversation === false) {
    return ApiResponse.forbidden(res, 'You are not part of this conversation');
  }

  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId }, $set: { readAt: new Date() } }
  );

  return ApiResponse.success(res, 200, 'Conversation marked as read');
});

module.exports = {
  getMyConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markRead,
};
