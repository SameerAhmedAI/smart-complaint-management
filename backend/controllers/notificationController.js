const db = require('../config/db').db;

// ─────────────────────────────────────────────
// @route  GET /api/notifications
// @access Private
// ─────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const notifications = db.prepare(`
      SELECT n.*, c.title AS complaintTitle, c.status AS complaintStatus
      FROM notifications n
      LEFT JOIN complaints c ON n.relatedComplaint = c.id
      WHERE n.recipient = ?
      ORDER BY n.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, Number(limit), offset).map((n) => ({
      ...n,
      _id: n.id,
      isRead: Boolean(n.isRead),
      relatedComplaint: n.relatedComplaint
        ? { _id: n.relatedComplaint, title: n.complaintTitle, status: n.complaintStatus }
        : null,
    }));

    const unreadCount = db.prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE recipient = ? AND isRead = 0'
    ).get(req.user.id).count;

    const total = db.prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE recipient = ?'
    ).get(req.user.id).count;

    return res.json({ success: true, total, unreadCount, page: Number(page), notifications });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  PUT /api/notifications/:id/read
// @access Private
// ─────────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const result = db.prepare(
      'UPDATE notifications SET isRead = 1 WHERE id = ? AND recipient = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  PUT /api/notifications/read-all
// @access Private
// ─────────────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET isRead = 1 WHERE recipient = ? AND isRead = 0')
      .run(req.user.id);

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  DELETE /api/notifications/:id
// @access Private
// ─────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const result = db.prepare(
      'DELETE FROM notifications WHERE id = ? AND recipient = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  DELETE /api/notifications
// @access Private
// ─────────────────────────────────────────────
const clearAllNotifications = async (req, res, next) => {
  try {
    db.prepare('DELETE FROM notifications WHERE recipient = ?').run(req.user.id);
    return res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
