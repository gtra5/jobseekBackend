/**
 * Chat Routes
 * Employer <-> job seeker messaging.
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');
const { isJobSeekerOrEmployer } = require('../middleware/roleMiddleware');

/**
 * @route   GET /api/chat/conversations
 * @desc    List current user's conversations
 * @access  Private (job seekers + employers)
 */
router.get('/conversations', authenticate, isJobSeekerOrEmployer, chatController.getMyConversations);

/**
 * @route   POST /api/chat/conversations
 * @desc    Get or create a conversation with another user
 * @body    { userId, jobId? }
 * @access  Private (job seekers + employers)
 */
router.post('/conversations', authenticate, isJobSeekerOrEmployer, chatController.getOrCreateConversation);

/**
 * @route   GET /api/chat/conversations/:conversationId/messages
 * @desc    Get messages in a conversation
 * @access  Private (participant only)
 */
router.get('/conversations/:conversationId/messages', authenticate, chatController.getMessages);

/**
 * @route   POST /api/chat/conversations/:conversationId/messages
 * @desc    Send a message in a conversation
 * @body    { content }
 * @access  Private (participant only)
 */
router.post('/conversations/:conversationId/messages', authenticate, chatController.sendMessage);

/**
 * @route   PUT /api/chat/conversations/:conversationId/read
 * @desc    Mark conversation messages as read
 * @access  Private (participant only)
 */
router.put('/conversations/:conversationId/read', authenticate, chatController.markRead);

module.exports = router;
