const db = require('../config/db').db;

// ─────────────────────────────────────────────
// @route  GET /api/notifications
// @access Private
// ─────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await db.query(`
      SELECT n.*, c.title AS complaintTitle, c.status AS complaintStatus
      FROM notifications n
      LEFT JOIN complaints c ON n.relatedComplaint = c.id
      WHERE n.recipient = $1
      ORDER BY n.createdAt DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, Number(limit), offset]);

    const notifications = rows.map((n) => ({
      ...n,
      _id: n.id,
      isRead: Boolean(n.isRead),
      relatedComplaint: n.relatedComplaint
        ? { _id: n.relatedComplaint, title: n.complaintTitle, status: n.complaintStatus }
        : null,
    }));

    const { rows: unreadCountRows } = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE recipient = $1 AND isRead = false',
      [req.user.id]
    );
    const unreadCount = Number(unreadCountRows[0].count);

    const { rows: totalRows } = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE recipient = $1',
      [req.user.id]
    );
    const total = Number(totalRows[0].count);

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
    const result = await db.query(
      'UPDATE notifications SET isRead = true WHERE id = $1 AND recipient = $2',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
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
    await db.query(
      'UPDATE notifications SET isRead = true WHERE recipient = $1 AND isRead = false',
      [req.user.id]
    );

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
    const result = await db.query(
      'DELETE FROM notifications WHERE id = $1 AND recipient = $2',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
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
    await db.query('DELETE FROM notifications WHERE recipient = $1', [req.user.id]);
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
