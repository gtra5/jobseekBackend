/**
 * Notification Routes
 * Routes for user notifications
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

// Static routes must be registered before /:notificationId so that
// Express doesn't treat the literal segments as a param match.

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get('/', authenticate, notificationController.getNotifications);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete('/read', authenticate, notificationController.deleteReadNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/:notificationId
 * @desc    Get notification by ID
 * @access  Private
 */
router.get('/:notificationId', authenticate, notificationController.getNotificationById);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', authenticate, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/:notificationId/unread
 * @desc    Mark notification as unread
 * @access  Private
 */
router.put('/:notificationId/unread', authenticate, notificationController.markAsUnread);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:notificationId', authenticate, notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications for current user
 * @access  Private
 */
router.delete('/', authenticate, notificationController.deleteAllNotifications);

module.exports = router;