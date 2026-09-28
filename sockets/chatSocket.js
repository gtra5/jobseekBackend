/**
 * Chat Socket Handler
 * Handles real-time messaging via Socket.io
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Initialize Socket.io
 * @param {http.Server} server - HTTP server instance
 * @returns {Socket.IO.Server} Socket.io instance
 */
const initializeSocket = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5174',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Access tokens are always signed as { id, role } (see authController.js's
      // generateAccessToken calls) — decoded.userId does not exist on this
      // payload and was always undefined, which made User.findById() match
      // nothing and silently reject every socket connection's authentication.
      const user = await User.findById(decoded.id).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId}`);

    // Join a personal room so direct notification events
    // (io.to(userId).emit...) reach this user's sockets.
    socket.join(socket.userId);
    socket.join(`user:${socket.userId}`);

    // Join conversation room
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Check if user is participant
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(conversationId);
        logger.info(`User ${socket.userId} joined conversation ${conversationId}`);

        // Mark messages as read
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: socket.userId }, readBy: { $ne: socket.userId } },
          { $addToSet: { readBy: socket.userId }, $set: { readAt: new Date() } }
        );

        // Opening a conversation also clears any "new message" notifications
        // tied to it, so the notification bell badge actually reflects real
        // unread messages instead of staying stuck after the user has
        // already read them here.
        try {
          const notifResult = await Notification.updateMany(
            { recipient: socket.userId, type: 'message', isRead: false, 'data.conversationId': conversationId },
            { isRead: true, readAt: new Date() }
          );
          if (notifResult.modifiedCount > 0) {
            // Nudge this user's own bell to refetch and show the drop immediately.
            io.to(socket.userId).emit('notification', { type: 'read_sync' });
          }
        } catch (notifErr) {
          logger.error(`Error clearing message notifications for conversation ${conversationId}: ${notifErr.message}`);
        }

        // Emit updated unread count
        const unreadCount = await Message.countDocuments({
          conversation: conversationId,
          sender: { $ne: socket.userId },
          readBy: { $ne: socket.userId },
        }).exec();

        socket.emit('unread_count', { conversationId, count: unreadCount });
      } catch (error) {
        logger.error(`Error joining conversation: ${error.message}`);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      logger.info(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Send message
    // `callback` is the Socket.IO ack (see emitWithAck on the client) —
    // optional, since other emitters of this event may not pass one.
    socket.on('send_message', async (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      try {
        const { conversationId, content } = data || {};

        // Validate input
        if (!conversationId || !content || content.trim().length === 0) {
          const errMsg = 'Invalid message data';
          socket.emit('error', { message: errMsg });
          return ack({ success: false, error: errMsg });
        }

        // Verify conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          const errMsg = 'Conversation not found';
          socket.emit('error', { message: errMsg });
          return ack({ success: false, error: errMsg });
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );

        if (!isParticipant) {
          const errMsg = 'Not authorized to send message';
          socket.emit('error', { message: errMsg });
          return ack({ success: false, error: errMsg });
        }

        // Create message
        const message = new Message({
          conversation: conversationId,
          sender: socket.userId,
          content: content.trim(),
          readBy: [socket.userId],
        });

        await message.save();

        // Update conversation's last message
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Populate message with sender info
        await message.populate('sender', 'firstName lastName avatar');

        // Flat payload — matches the shape chatController.js's REST
        // sendMessage returns, so the client treats both paths identically.
        const messagePayload = {
          id: message._id,
          conversation: message.conversation,
          sender: message.sender,
          content: message.content,
          readBy: message.readBy,
          createdAt: message.createdAt,
        };

        // Broadcast to conversation room
        io.to(conversationId).emit('new_message', messagePayload);

        // Send notification to other participants
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== socket.userId
        );

        const senderName = [socket.user.firstName, socket.user.lastName].filter(Boolean).join(' ') || 'Someone';

        otherParticipants.forEach((participantId) => {
          io.to(participantId.toString()).emit('notification', {
            type: 'new_message',
            conversationId,
            message: message._id,
            sender: socket.user,
          });
        });

        // Persist an actual Notification document per recipient — without
        // this, the "notification" socket event above triggers the bell to
        // refetch, but there was nothing new in the database for it to find,
        // so the badge never actually reflected the message that "caused" it.
        try {
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
          logger.error(`Failed to create message notification: ${notifErr.message}`);
        }

        logger.info(`Message sent in conversation ${conversationId} by user ${socket.userId}`);

        ack({ success: true, message: messagePayload });
      } catch (error) {
        logger.error(`Error sending message: ${error.message}`);
        socket.emit('error', { message: 'Failed to send message' });
        ack({ success: false, error: 'Failed to send message' });
      }
    });

    // Mark message as read
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;

        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: socket.userId }, readBy: { $ne: socket.userId } },
          { $addToSet: { readBy: socket.userId }, $set: { readAt: new Date() } }
        );

        // Same badge-clearing as join_conversation — this handler is a
        // separate entry point (e.g. re-marking read without rejoining)
        // and needs to keep the notification bell in sync too.
        try {
          const notifResult = await Notification.updateMany(
            { recipient: socket.userId, type: 'message', isRead: false, 'data.conversationId': conversationId },
            { isRead: true, readAt: new Date() }
          );
          if (notifResult.modifiedCount > 0) {
            io.to(socket.userId).emit('notification', { type: 'read_sync' });
          }
        } catch (notifErr) {
          logger.error(`Error clearing message notifications for conversation ${conversationId}: ${notifErr.message}`);
        }

        // Notify sender that messages were read
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const senderId = conversation.participants.find(
            (p) => p.toString() !== socket.userId
          );

          if (senderId) {
            io.to(senderId.toString()).emit('messages_read', {
              conversationId,
              readerId: socket.userId,
            });
          }
        }

        logger.info(`Messages marked as read in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        logger.error(`Error marking messages as read: ${error.message}`);
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('user_typing', {
        conversationId,
        userId: socket.userId,
        user: socket.user,
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId,
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  return io;
};

module.exports = { initializeSocket };