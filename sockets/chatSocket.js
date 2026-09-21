/**
 * Chat Socket Handler
 * Handles real-time messaging via Socket.io
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
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
      const user = await User.findById(decoded.userId).select('-password');

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
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content } = data;

        // Validate input
        if (!conversationId || !content || content.trim().length === 0) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Verify conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to send message' });
          return;
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

        // Broadcast to conversation room
        io.to(conversationId).emit('new_message', message);

        // Send notification to other participants
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== socket.userId
        );

        otherParticipants.forEach((participantId) => {
          io.to(participantId.toString()).emit('notification', {
            type: 'new_message',
            conversationId,
            message: message._id,
            sender: socket.user,
          });
        });

        logger.info(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        logger.error(`Error sending message: ${error.message}`);
        socket.emit('error', { message: 'Failed to send message' });
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