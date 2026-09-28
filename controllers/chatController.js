/**
 * Chat Controller
 * Handles employer <-> job seeker conversations and messages.
 * All endpoints require authentication and restrict users to their own threads.
 */

const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

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
 * Mark any unread "message" notifications for this conversation as read for
 * this user, and nudge their own notification bell to refetch immediately.
 * Without this, opening/reading a conversation leaves the bell badge stuck
 * on a stale count until something else happens to trigger a refresh.
 */
const clearMessageNotifications = async (userId, conversationId, io) => {
  try {
    const result = await Notification.updateMany(
      { recipient: userId, type: 'message', isRead: false, 'data.conversationId': conversationId },
      { isRead: true, readAt: new Date() }
    );
    if (result.modifiedCount > 0 && io) {
      io.to(userId).emit('notification', { type: 'read_sync' });
    }
  } catch (notifErr) {
    console.error('Error clearing message notifications:', notifErr.message);
  }
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
    // req.userId is a string. Unlike find()/updateMany(), aggregate() does NOT
    // cast strings to ObjectIds, so without this the $ne checks below never
    // matched anything: every message (even your own, even already-read ones)
    // counted as unread on every reload and the badge came back after leaving
    // the page. Cast explicitly.
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const unread = await Message.aggregate([
      { $match: { conversation: { $in: ids }, sender: { $ne: userObjectId } } },
      { $match: { readBy: { $ne: userObjectId } } },
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
  await clearMessageNotifications(userId, conversationId, req.app.get('io'));

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

  const messagePayload = {
    id: message._id,
    conversation: message.conversation,
    sender: message.sender,
    content: message.content,
    readBy: message.readBy,
    createdAt: message.createdAt,
  };

  // Push to the conversation room in real time. This is the REST fallback
  // path (the frontend sends over the socket directly when connected) — but
  // when the socket is down at send time, this is the only way the other
  // participant finds out a message arrived, so it must broadcast too.
  const io = req.app.get('io');
  if (io) {
    io.to(conversationId).emit('new_message', messagePayload);
  } else {
    console.warn('sendMessage: no io instance on req.app — message saved but not broadcast');
  }

  // Persist an actual Notification for the other participant(s) — mirrors
  // chatSocket.js's send_message handler so the notification bell reflects
  // real messages the same way whether they arrive over the socket or this
  // REST fallback.
  try {
    const senderName = [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(' ') || 'Someone';
    const otherParticipants = conversation.participants.filter((p) => p.toString() !== userId);
    await Promise.all(otherParticipants.map((participantId) => Notification.create({
      recipient: participantId,
      type: 'message',
      title: `New message from ${senderName}`,
      message: content.trim().slice(0, 140),
      relatedEntity: { type: 'message', id: message._id },
      actionUrl: `/chat?conversation=${conversationId}`,
      data: { conversationId },
    })));
  } catch (notifErr) {
    console.error('Failed to create message notification:', notifErr.message);
  }

  return ApiResponse.created(res, 'Message sent', {
    message: messagePayload,
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
  await clearMessageNotifications(userId, conversationId, req.app.get('io'));

  return ApiResponse.success(res, 200, 'Conversation marked as read');
});

module.exports = {
  getMyConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markRead,
};