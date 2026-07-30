/**
 * Notification Controller
 * Handles user notifications
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const query = { recipient: req.userId };

  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  // Filter out expired notifications
  query.$or = [
    { expiresAt: { $gt: new Date() } },
    { expiresAt: null },
  ];

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    recipient: req.userId,
    isRead: false,
  });

  return ApiResponse.success(res, 200, 'Notifications retrieved successfully', {
    notifications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    unreadCount,
  });
});

/**
 * GET /api/notifications/:notificationId
 * Get notification by ID
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  // Check if notification belongs to user
  if (notification.recipient.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Access denied');
  }

  return ApiResponse.success(res, 200, 'Notification retrieved successfully', { notification });
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  if (notification.recipient.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Access denied');
  }

  await notification.markAsRead();

  return ApiResponse.success(res, 200, 'Notification marked as read', { notification });
});

/**
 * PUT /api/notifications/:notificationId/unread
 * Mark notification as unread
 */
const markAsUnread = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  if (notification.recipient.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Access denied');
  }

  await notification.markAsUnread();

  return ApiResponse.success(res, 200, 'Notification marked as unread', { notification });
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return ApiResponse.success(res, 200, 'All notifications marked as read');
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  if (notification.recipient.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Access denied');
  }

  await notification.deleteOne();

  return ApiResponse.success(res, 200, 'Notification deleted successfully');
});

/**
 * DELETE /api/notifications
 * Delete all notifications for current user
 */
const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.userId });

  return ApiResponse.success(res, 200, 'All notifications deleted successfully');
});

/**
 * DELETE /api/notifications/read
 * Delete all read notifications
 */
const deleteReadNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.userId, isRead: true });

  return ApiResponse.success(res, 200, 'Read notifications deleted successfully');
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.userId,
    isRead: false,
  });

  return ApiResponse.success(res, 200, 'Unread count retrieved', { count });
});

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
  getUnreadCount,
};
