const db = require('../config/db').db;

// ─────────────────────────────────────────────
// @route  GET /api/dashboard/stats
// @access Private
// ─────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    // ── Admin ──────────────────────────────────────────────────────────────────
    if (role === 'admin') {
      const totalComplaints  = db.prepare("SELECT COUNT(*) AS c FROM complaints").get().c;
      const pendingCount     = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE status = 'pending'").get().c;
      const inProgressCount  = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE status = 'in-progress'").get().c;
      const resolvedCount    = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE status = 'resolved'").get().c;
      const rejectedCount    = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE status = 'rejected'").get().c;
      const totalUsers       = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'  AND isActive = 1").get().c;
      const totalStaff       = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'staff' AND isActive = 1").get().c;

      const byCategory = db.prepare(
        "SELECT category AS name, COUNT(*) AS value FROM complaints GROUP BY category ORDER BY value DESC"
      ).all();

      const byPriority = db.prepare(
        "SELECT priority AS name, COUNT(*) AS value FROM complaints GROUP BY priority"
      ).all();

      // 6-month trend using SQLite date functions
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const cutoff = sixMonthsAgo.toISOString().slice(0, 10); // YYYY-MM-DD

      const trendRows = db.prepare(`
        SELECT
          strftime('%Y-%m', createdAt) AS yearMonth,
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
        FROM complaints
        WHERE createdAt >= ?
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY yearMonth
      `).all(cutoff);

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthlyTrend = trendRows.map((r) => {
        const [year, month] = r.yearMonth.split('-');
        return {
          month: `${monthNames[parseInt(month, 10) - 1]} ${year}`,
          total: r.total,
          resolved: r.resolved,
        };
      });

      const recentComplaints = db.prepare(`
        SELECT
          c.id, c.title, c.status, c.priority, c.category, c.createdAt,
          u1.name AS submittedByName, u1.email AS submittedByEmail,
          u2.name AS assignedToName
        FROM complaints c
        LEFT JOIN users u1 ON c.submittedBy = u1.id
        LEFT JOIN users u2 ON c.assignedTo  = u2.id
        ORDER BY c.createdAt DESC LIMIT 5
      `).all().map((r) => ({
        _id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        category: r.category,
        createdAt: r.createdAt,
        submittedBy: { name: r.submittedByName, email: r.submittedByEmail },
        assignedTo: r.assignedToName ? { name: r.assignedToName } : null,
      }));

      return res.json({
        success: true,
        role: 'admin',
        stats: {
          totalComplaints,
          pendingCount,
          inProgressCount,
          resolvedCount,
          rejectedCount,
          totalUsers,
          totalStaff,
          resolutionRate: totalComplaints > 0
            ? Math.round((resolvedCount / totalComplaints) * 100)
            : 0,
        },
        byCategory,
        byPriority,
        monthlyTrend,
        recentComplaints,
      });
    }

    // ── Staff ──────────────────────────────────────────────────────────────────
    if (role === 'staff') {
      const assignedTotal      = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = ?").get(userId).c;
      const assignedPending    = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = ? AND status = 'pending'").get(userId).c;
      const assignedInProgress = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = ? AND status = 'in-progress'").get(userId).c;
      const assignedResolved   = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = ? AND status = 'resolved'").get(userId).c;

      const recentComplaints = db.prepare(`
        SELECT c.id, c.title, c.status, c.priority, c.createdAt,
          u.name AS submittedByName, u.email AS submittedByEmail
        FROM complaints c
        LEFT JOIN users u ON c.submittedBy = u.id
        WHERE c.assignedTo = ?
        ORDER BY c.createdAt DESC LIMIT 5
      `).all(userId).map((r) => ({
        _id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        createdAt: r.createdAt,
        submittedBy: { name: r.submittedByName, email: r.submittedByEmail },
      }));

      return res.json({
        success: true,
        role: 'staff',
        stats: {
          assignedTotal,
          assignedPending,
          assignedInProgress,
          assignedResolved,
          resolutionRate: assignedTotal > 0
            ? Math.round((assignedResolved / assignedTotal) * 100)
            : 0,
        },
        recentComplaints,
      });
    }

    // ── User ───────────────────────────────────────────────────────────────────
    const userTotal      = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = ?").get(userId).c;
    const userPending    = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = ? AND status = 'pending'").get(userId).c;
    const userInProgress = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = ? AND status = 'in-progress'").get(userId).c;
    const userResolved   = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = ? AND status = 'resolved'").get(userId).c;
    const userRejected   = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = ? AND status = 'rejected'").get(userId).c;

    const recentComplaints = db.prepare(`
      SELECT c.id, c.title, c.status, c.priority, c.createdAt,
        u.name AS assignedToName, u.department AS assignedToDepartment
      FROM complaints c
      LEFT JOIN users u ON c.assignedTo = u.id
      WHERE c.submittedBy = ?
      ORDER BY c.createdAt DESC LIMIT 5
    `).all(userId).map((r) => ({
      _id: r.id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt,
      assignedTo: r.assignedToName ? { name: r.assignedToName, department: r.assignedToDepartment } : null,
    }));

    return res.json({
      success: true,
      role: 'user',
      stats: { userTotal, userPending, userInProgress, userResolved, userRejected },
      recentComplaints,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
