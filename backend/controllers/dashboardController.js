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
      const totalComplaints  = Number((await db.query("SELECT COUNT(*) AS c FROM complaints")).rows[0].c);
      const pendingCount     = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE status = 'pending'")).rows[0].c);
      const inProgressCount  = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE status = 'in-progress'")).rows[0].c);
      const resolvedCount    = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE status = 'resolved'")).rows[0].c);
      const rejectedCount    = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE status = 'rejected'")).rows[0].c);
      const totalUsers       = Number((await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'user'  AND isActive = true")).rows[0].c);
      const totalStaff       = Number((await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'staff' AND isActive = true")).rows[0].c);

      const { rows: byCategory } = await db.query(
        "SELECT category AS name, COUNT(*) AS value FROM complaints GROUP BY category ORDER BY value DESC"
      );
      const formattedByCategory = byCategory.map(item => ({ ...item, value: Number(item.value) }));

      const { rows: byPriority } = await db.query(
        "SELECT priority AS name, COUNT(*) AS value FROM complaints GROUP BY priority"
      );
      const formattedByPriority = byPriority.map(item => ({ ...item, value: Number(item.value) }));

      // 6-month trend using PostgreSQL to_char function
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const cutoff = sixMonthsAgo.toISOString().slice(0, 10); // YYYY-MM-DD

      const { rows: trendRows } = await db.query(`
        SELECT
          to_char(createdAt, 'YYYY-MM') AS "yearMonth",
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
        FROM complaints
        WHERE createdAt >= $1
        GROUP BY to_char(createdAt, 'YYYY-MM')
        ORDER BY "yearMonth"
      `, [cutoff]);

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthlyTrend = trendRows.map((r) => {
        const [year, month] = r.yearMonth.split('-');
        return {
          month: `${monthNames[parseInt(month, 10) - 1]} ${year}`,
          total: Number(r.total),
          resolved: Number(r.resolved || 0),
        };
      });

      const { rows: recentComplaintsRows } = await db.query(`
        SELECT
          c.id, c.title, c.status, c.priority, c.category, c.createdAt,
          u1.name AS submittedByName, u1.email AS submittedByEmail,
          u2.name AS assignedToName
        FROM complaints c
        LEFT JOIN users u1 ON c.submittedBy = u1.id
        LEFT JOIN users u2 ON c.assignedTo  = u2.id
        ORDER BY c.createdAt DESC LIMIT 5
      `);

      const recentComplaints = recentComplaintsRows.map((r) => ({
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
        byCategory: formattedByCategory,
        byPriority: formattedByPriority,
        monthlyTrend,
        recentComplaints,
      });
    }

    // ── Staff ──────────────────────────────────────────────────────────────────
    if (role === 'staff') {
      const assignedTotal      = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = $1", [userId])).rows[0].c);
      const assignedPending    = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = $1 AND status = 'pending'", [userId])).rows[0].c);
      const assignedInProgress = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = $1 AND status = 'in-progress'", [userId])).rows[0].c);
      const assignedResolved   = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE assignedTo = $1 AND status = 'resolved'", [userId])).rows[0].c);

      const { rows: staffRecentRows } = await db.query(`
        SELECT c.id, c.title, c.status, c.priority, c.createdAt,
          u.name AS submittedByName, u.email AS submittedByEmail
        FROM complaints c
        LEFT JOIN users u ON c.submittedBy = u.id
        WHERE c.assignedTo = $1
        ORDER BY c.createdAt DESC LIMIT 5
      `, [userId]);

      const recentComplaints = staffRecentRows.map((r) => ({
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
    const userTotal      = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = $1", [userId])).rows[0].c);
    const userPending    = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = $1 AND status = 'pending'", [userId])).rows[0].c);
    const userInProgress = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = $1 AND status = 'in-progress'", [userId])).rows[0].c);
    const userResolved   = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = $1 AND status = 'resolved'", [userId])).rows[0].c);
    const userRejected   = Number((await db.query("SELECT COUNT(*) AS c FROM complaints WHERE submittedBy = $1 AND status = 'rejected'", [userId])).rows[0].c);

    const { rows: userRecentRows } = await db.query(`
      SELECT c.id, c.title, c.status, c.priority, c.createdAt,
        u.name AS assignedToName, u.department AS assignedToDepartment
      FROM complaints c
      LEFT JOIN users u ON c.assignedTo = u.id
      WHERE c.submittedBy = $1
      ORDER BY c.createdAt DESC LIMIT 5
    `, [userId]);

    const recentComplaints = userRecentRows.map((r) => ({
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
