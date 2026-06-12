const db = require('../config/db').db;
const { analyzeComplaint } = require('../utils/geminiAI');
const {
  sendComplaintConfirmation,
  sendStatusUpdate,
  sendAssignmentNotification,
} = require('../utils/emailService');

const now = () => new Date().toISOString();

// ─── Helper: shape a raw DB row into the API response object ──────────────────
const formatComplaint = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    aiAnalysis: {
      category: row.aiCategory,
      priority: row.aiPriority,
      suggestedDepartment: row.aiSuggestedDepartment,
      sentiment: row.aiSentiment,
      summary: row.aiSummary,
    },
    submittedBy: row.submittedBy
      ? {
          _id: row.submittedBy,
          name: row.submittedByName,
          email: row.submittedByEmail,
        }
      : null,
    assignedTo: row.assignedTo
      ? {
          _id: row.assignedTo,
          name: row.assignedToName,
          email: row.assignedToEmail,
          department: row.assignedToDepartment,
        }
      : null,
  };
};

const COMPLAINT_JOIN = `
  SELECT
    c.*,
    u1.name  AS submittedByName,  u1.email AS submittedByEmail,
    u2.name  AS assignedToName,   u2.email AS assignedToEmail,
    u2.department AS assignedToDepartment
  FROM complaints c
  LEFT JOIN users u1 ON c.submittedBy = u1.id
  LEFT JOIN users u2 ON c.assignedTo  = u2.id
`;

// ─────────────────────────────────────────────
// @route  POST /api/complaints
// @access Private/User
// ─────────────────────────────────────────────
const submitComplaint = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    // Run AI analysis
    const ai = await analyzeComplaint(title, description);
    const ts = now();

    const result = db.prepare(`
      INSERT INTO complaints
        (title, description, category, priority, status,
         aiCategory, aiPriority, aiSuggestedDepartment, aiSentiment, aiSummary,
         submittedBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description, ai.category, ai.priority,
      ai.category, ai.priority, ai.suggestedDepartment, ai.sentiment, ai.summary,
      req.user.id, ts, ts
    );

    const complaintId = result.lastInsertRowid;

    // Notify submitter
    db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES (?, ?, ?, 'complaint_submitted', ?, ?)
    `).run(
      req.user.id,
      'Complaint Submitted',
      `Your complaint "${title}" has been received. AI Category: ${ai.category} | Priority: ${ai.priority}`,
      complaintId, now()
    );

    // Notify all admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND isActive = 1").all();
    const insertNotif = db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES (?, ?, ?, 'complaint_submitted', ?, ?)
    `);
    for (const admin of admins) {
      insertNotif.run(
        admin.id,
        'New Complaint Submitted',
        `A new ${ai.priority} priority complaint "${title}" (${ai.category}) has been submitted.`,
        complaintId, now()
      );
    }

    // Confirmation email
    sendComplaintConfirmation(req.user.email, req.user.name, title);

    const complaint = db.prepare(COMPLAINT_JOIN + ' WHERE c.id = ?').get(complaintId);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint: formatComplaint(complaint),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/complaints/my
// @access Private/User
// ─────────────────────────────────────────────
const getUserComplaints = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = 'WHERE c.submittedBy = ?';
    const params = [req.user.id];

    if (status) {
      where += ' AND c.status = ?';
      params.push(status);
    }

    const complaints = db.prepare(
      COMPLAINT_JOIN + where + ' ORDER BY c.createdAt DESC LIMIT ? OFFSET ?'
    ).all(...params, Number(limit), offset).map(formatComplaint);

    const total = db.prepare(
      `SELECT COUNT(*) as count FROM complaints WHERE submittedBy = ?${status ? ' AND status = ?' : ''}`
    ).get(...(status ? [req.user.id, status] : [req.user.id])).count;

    return res.json({ success: true, total, page: Number(page), complaints });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/complaints
// @access Private/Admin,Staff
// ─────────────────────────────────────────────
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = 'WHERE 1=1';
    const params = [];

    // Staff only see their assigned complaints
    if (req.user.role === 'staff') {
      where += ' AND c.assignedTo = ?';
      params.push(req.user.id);
    }
    if (status)   { where += ' AND c.status = ?';   params.push(status); }
    if (category) { where += ' AND c.category = ?'; params.push(category); }
    if (priority) { where += ' AND c.priority = ?'; params.push(priority); }
    if (search) {
      where += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const complaints = db.prepare(
      COMPLAINT_JOIN + where + ' ORDER BY c.createdAt DESC LIMIT ? OFFSET ?'
    ).all(...params, Number(limit), offset).map(formatComplaint);

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM complaints c ${where}`
    ).get(...params);

    return res.json({ success: true, total: countRow.count, page: Number(page), complaints });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/complaints/:id
// @access Private
// ─────────────────────────────────────────────
const getComplaintById = async (req, res, next) => {
  try {
    const row = db.prepare(COMPLAINT_JOIN + ' WHERE c.id = ?').get(req.params.id);

    if (!row) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Users can only see their own complaints
    if (req.user.role === 'user' && row.submittedBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, complaint: formatComplaint(row) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  PUT /api/complaints/:id/status
// @access Private/Admin,Staff
// ─────────────────────────────────────────────
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, resolution, note } = req.body;
    const validStatuses = ['pending', 'in-progress', 'resolved', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const complaint = db.prepare(COMPLAINT_JOIN + ' WHERE c.id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Staff can only update their assigned complaints
    if (req.user.role === 'staff' && complaint.assignedTo !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your assigned complaints' });
    }

    const newResolution = resolution || complaint.resolutionNote;

    db.prepare(`
      UPDATE complaints SET status = ?, resolutionNote = ?, updatedAt = ? WHERE id = ?
    `).run(status, newResolution, now(), complaint.id);

    // Notify complaint owner
    db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES (?, ?, ?, 'status_update', ?, ?)
    `).run(
      complaint.submittedBy,
      'Complaint Status Updated',
      `Your complaint "${complaint.title}" status is now: ${status.toUpperCase()}${newResolution ? '. Note: ' + newResolution : ''}`,
      complaint.id, now()
    );

    // Send email to owner
    sendStatusUpdate(complaint.submittedByEmail, complaint.submittedByName, complaint.title, status);

    const updated = db.prepare(COMPLAINT_JOIN + ' WHERE c.id = ?').get(complaint.id);
    return res.json({ success: true, message: 'Status updated successfully', complaint: formatComplaint(updated) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  PUT /api/complaints/:id/assign
// @access Private/Admin
// ─────────────────────────────────────────────
const assignComplaint = async (req, res, next) => {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ success: false, message: 'Staff ID is required' });

    const staff = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'staff'").get(staffId);
    if (!staff) return res.status(400).json({ success: false, message: 'Invalid staff member' });

    const complaint = db.prepare(COMPLAINT_JOIN + ' WHERE c.id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const newStatus = complaint.status === 'pending' ? 'in-progress' : complaint.status;

    db.prepare(`
      UPDATE complaints SET assignedTo = ?, status = ?, updatedAt = ? WHERE id = ?
    `).run(staffId, newStatus, now(), complaint.id);

    // Notify staff
    db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES (?, ?, ?, 'assignment', ?, ?)
    `).run(
      staffId,
      'Complaint Assigned to You',
      `You have been assigned the complaint: "${complaint.title}"`,
      complaint.id, now()
    );

    // Notify complaint owner
    db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES (?, ?, ?, 'assignment', ?, ?)
    `).run(
      complaint.submittedBy,
      'Complaint Assigned',
      `Your complaint "${complaint.title}" has been assigned to ${staff.name} for resolution.`,
      complaint.id, now()
    );

    sendAssignmentNotification(staff.email, staff.name, complaint.title);

    const updated = db.prepare(COMPLAINT_JOIN + ' WHERE c.id = ?').get(complaint.id);
    return res.json({ success: true, message: 'Complaint assigned successfully', complaint: formatComplaint(updated) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  DELETE /api/complaints/:id
// @access Private/Admin
// ─────────────────────────────────────────────
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = db.prepare('SELECT id FROM complaints WHERE id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // FK cascade handles related notifications automatically
    db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);

    return res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitComplaint,
  getUserComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  deleteComplaint,
};
