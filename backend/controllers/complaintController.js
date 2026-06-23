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

    const result = await db.query(`
      INSERT INTO complaints
        (title, description, category, priority, status,
         aiCategory, aiPriority, aiSuggestedDepartment, aiSentiment, aiSummary,
         submittedBy, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      title, description, ai.category, ai.priority,
      ai.category, ai.priority, ai.suggestedDepartment, ai.sentiment, ai.summary,
      req.user.id, ts, ts
    ]);

    const complaintId = result.rows[0].id;

    // Notify submitter
    await db.query(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES ($1, $2, $3, 'complaint_submitted', $4, $5)
    `, [
      req.user.id,
      'Complaint Submitted',
      `Your complaint "${title}" has been received. AI Category: ${ai.category} | Priority: ${ai.priority}`,
      complaintId, now()
    ]);

    // Notify all admins
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'admin' AND isActive = true");
    for (const admin of admins) {
      await db.query(`
        INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
        VALUES ($1, $2, $3, 'complaint_submitted', $4, $5)
      `, [
        admin.id,
        'New Complaint Submitted',
        `A new ${ai.priority} priority complaint "${title}" (${ai.category}) has been submitted.`,
        complaintId, now()
      ]);
    }

    // Confirmation email
    sendComplaintConfirmation(req.user.email, req.user.name, title);

    const { rows: complaintRows } = await db.query(COMPLAINT_JOIN + ' WHERE c.id = $1', [complaintId]);
    const complaint = complaintRows[0];

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

    let where = 'WHERE c.submittedBy = $1';
    const params = [req.user.id];

    if (status) {
      where += ' AND c.status = $2';
      params.push(status);
    }

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    params.push(Number(limit), offset);

    const { rows: complaints } = await db.query(
      COMPLAINT_JOIN + where + ` ORDER BY c.createdAt DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      params
    );

    let countQuery = 'SELECT COUNT(*) as count FROM complaints WHERE submittedBy = $1';
    const countParams = [req.user.id];
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    const { rows: countRows } = await db.query(countQuery, countParams);
    const total = Number(countRows[0].count);

    return res.json({ success: true, total, page: Number(page), complaints: complaints.map(formatComplaint) });
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
      params.push(req.user.id);
      where += ` AND c.assignedTo = $${params.length}`;
    }
    if (status)   {
      params.push(status);
      where += ` AND c.status = $${params.length}`;
    }
    if (category) {
      params.push(category);
      where += ` AND c.category = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      where += ` AND c.priority = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (c.title LIKE $${params.length} OR c.description LIKE $${params.length})`;
    }

    const countParams = [...params];

    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const { rows: complaints } = await db.query(
      COMPLAINT_JOIN + where + ` ORDER BY c.createdAt DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) as count FROM complaints c ${where}`,
      countParams
    );
    const total = Number(countRows[0].count);

    return res.json({ success: true, total, page: Number(page), complaints: complaints.map(formatComplaint) });
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
    const { rows } = await db.query(COMPLAINT_JOIN + ' WHERE c.id = $1', [req.params.id]);
    const row = rows[0];

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

    const { rows } = await db.query(COMPLAINT_JOIN + ' WHERE c.id = $1', [req.params.id]);
    const complaint = rows[0];
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Staff can only update their assigned complaints
    if (req.user.role === 'staff' && complaint.assignedTo !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your assigned complaints' });
    }

    const newResolution = resolution || complaint.resolutionNote;

    await db.query(`
      UPDATE complaints SET status = $1, resolutionNote = $2, updatedAt = $3 WHERE id = $4
    `, [status, newResolution, now(), complaint.id]);

    // Notify complaint owner
    await db.query(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES ($1, $2, $3, 'status_update', $4, $5)
    `, [
      complaint.submittedBy,
      'Complaint Status Updated',
      `Your complaint "${complaint.title}" status is now: ${status.toUpperCase()}${newResolution ? '. Note: ' + newResolution : ''}`,
      complaint.id, now()
    ]);

    // Send email to owner
    sendStatusUpdate(complaint.submittedByEmail, complaint.submittedByName, complaint.title, status);

    const { rows: updatedRows } = await db.query(COMPLAINT_JOIN + ' WHERE c.id = $1', [complaint.id]);
    const updated = updatedRows[0];
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

    const { rows: staffRows } = await db.query("SELECT * FROM users WHERE id = $1 AND role = 'staff'", [staffId]);
    const staff = staffRows[0];
    if (!staff) return res.status(400).json({ success: false, message: 'Invalid staff member' });

    const { rows: complaintRows } = await db.query(COMPLAINT_JOIN + ' WHERE c.id = $1', [req.params.id]);
    const complaint = complaintRows[0];
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const newStatus = complaint.status === 'pending' ? 'in-progress' : complaint.status;

    await db.query(`
      UPDATE complaints SET assignedTo = $1, status = $2, updatedAt = $3 WHERE id = $4
    `, [staffId, newStatus, now(), complaint.id]);

    // Notify staff
    await db.query(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES ($1, $2, $3, 'assignment', $4, $5)
    `, [
      staffId,
      'Complaint Assigned to You',
      `You have been assigned the complaint: "${complaint.title}"`,
      complaint.id, now()
    ]);

    // Notify complaint owner
    await db.query(`
      INSERT INTO notifications (recipient, title, message, type, relatedComplaint, createdAt)
      VALUES ($1, $2, $3, 'assignment', $4, $5)
    `, [
      complaint.submittedBy,
      'Complaint Assigned',
      `Your complaint "${complaint.title}" has been assigned to ${staff.name} for resolution.`,
      complaint.id, now()
    ]);

    sendAssignmentNotification(staff.email, staff.name, complaint.title);

    const { rows: updatedRows } = await db.query(COMPLAINT_JOIN + ' WHERE c.id = $1', [complaint.id]);
    const updated = updatedRows[0];
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
    const { rows } = await db.query('SELECT id FROM complaints WHERE id = $1', [req.params.id]);
    const complaint = rows[0];
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // FK cascade handles related notifications automatically
    await db.query('DELETE FROM complaints WHERE id = $1', [req.params.id]);

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
