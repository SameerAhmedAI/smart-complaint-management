import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

/* ── Chart color palette ──────────────────────────────── */
const CHART_COLORS = ['#4d8eff', '#d4a73c', '#3fb87f', '#e05a5a', '#c084fc', '#14b8a6', '#f97316', '#a78bfa'];

/* ── Status / Priority configs ───────────────────────── */
const statusConfig = {
  pending:       { label: 'PENDING',     stampClass: 'stamp stamp-pending',  topBorder: 'var(--accent-pending)'  },
  'in-progress': { label: 'IN PROGRESS', stampClass: 'stamp stamp-progress', topBorder: 'var(--accent-progress)' },
  resolved:      { label: 'RESOLVED',    stampClass: 'stamp stamp-resolved', topBorder: 'var(--accent-resolved)' },
  rejected:      { label: 'REJECTED',    stampClass: 'stamp stamp-rejected', topBorder: 'var(--accent-rejected)' },
};

const priorityConfig = {
  low:      { stampClass: 'stamp stamp-neutral'  },
  medium:   { stampClass: 'stamp stamp-pending'  },
  high:     { stampClass: 'stamp stamp-progress' },
  critical: { stampClass: 'stamp stamp-critical' },
};

/* ── Stat Card ────────────────────────────────────────── */
const StatCard = ({ label, value, topColor, sub }) => (
  <div style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderTop: `4px solid ${topColor}`,
    borderRadius: 'var(--radius-md)',
    padding: '16px 18px',
  }}>
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: '8px',
    }}>{label}</p>
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '30px',
      fontWeight: 600,
      color: topColor,
      lineHeight: 1,
    }}>{value ?? '—'}</p>
    {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</p>}
  </div>
);

/* ── Case Reference Generator ─────────────────────────── */
const caseRef = (id) => {
  const idStr = String(id ?? '');
  return `CASE-${idStr.padStart(4, '0')}`;
};

/* ── Chart panel wrapper ──────────────────────────────── */
const ChartPanel = ({ title, children }) => (
  <div style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '18px',
  }}>
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: '14px',
    }}>{title}</p>
    {children}
  </div>
);

/* ── Field style ──────────────────────────────────────── */
const fieldStyle = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

/* ── Tooltip style for recharts ───────────────────────── */
const tooltipStyle = {
  contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' },
  itemStyle: { color: 'var(--text-secondary)' },
  labelStyle: { color: 'var(--text-muted)', fontSize: '11px' },
};

/* ── AdminDashboard ────────────────────────────────────── */
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byPriority, setByPriority] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data.stats);
      setByCategory(data.byCategory || []);
      setByPriority(data.byPriority || []);
      setMonthlyTrend(data.monthlyTrend || []);
      setRecentComplaints(data.recentComplaints || []);
    } catch {
      toast.error('Failed to load dashboard stats');
    }
  }, []);

  const fetchComplaints = useCallback(async () => {
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/complaints', { params });
      setAllComplaints(data.complaints || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load complaints');
    }
  }, [page, statusFilter]);

  const filteredComplaints = searchQuery
    ? allComplaints.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.submittedBy?.name?.toLowerCase().includes(q)
        );
      })
    : allComplaints;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(val.trim()), 300);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    clearTimeout(searchDebounceRef.current);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users || []);
    } catch {}
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/staff');
      setStaffList(data.staff || []);
    } catch {}
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchComplaints(), fetchUsers(), fetchStaff()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchDashboard, fetchComplaints, fetchUsers, fetchStaff]);

  const handleAssign = async () => {
    if (!selectedStaff) { toast.error('Select a staff member'); return; }
    setAssigning(true);
    try {
      await api.put(`/complaints/${selectedComplaint._id}/assign`, { staffId: selectedStaff });
      toast.success('Complaint assigned successfully');
      setSelectedComplaint(null);
      setSelectedStaff('');
      fetchComplaints();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint permanently?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/complaints/${id}`);
      toast.success('Complaint deleted');
      setAllComplaints((prev) => prev.filter((c) => c._id !== id));
      fetchDashboard();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    setUpdatingStatusId(complaintId);
    try {
      await api.put(`/complaints/${complaintId}/status`, { status: newStatus });
      toast.success(`Status updated to "${newStatus}"`);
      setAllComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? { ...c, status: newStatus } : c))
      );
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleToggleUserActive = async (userId, isActive) => {
    try {
      await api.put(`/auth/users/${userId}`, { isActive: !isActive });
      toast.success(`User ${isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Update failed');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border-strong)', borderTop: '2px solid var(--accent-rejected)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Shared tab style ──────────────────────────────── */
  const tabStyle = (key) => ({
    padding: '6px 14px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${activeTab === key ? 'var(--accent-rejected)' : 'transparent'}`,
    background: activeTab === key ? 'color-mix(in srgb, var(--accent-rejected) 12%, transparent)' : 'transparent',
    color: activeTab === key ? 'var(--accent-rejected)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              SYSTEM COMMAND
            </span>
            <span style={{ width: 32, height: '1px', background: 'var(--border-strong)' }} />
            <span className="stamp stamp-admin">ADMIN</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
            Operations Control Center
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            System-wide overview and case management
          </p>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>◈ OVERVIEW</button>
          <button style={tabStyle('complaints')} onClick={() => setActiveTab('complaints')}>▦ ALL CASES</button>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>◉ USERS</button>
        </div>

        {/* ────────────── OVERVIEW TAB ────────────── */}
        {activeTab === 'overview' && stats && (
          <>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <StatCard label="Total Cases"    value={stats.totalComplaints} topColor="var(--text-muted)" />
              <StatCard label="Pending"        value={stats.pendingCount}    topColor="var(--accent-pending)" />
              <StatCard label="In Progress"    value={stats.inProgressCount} topColor="var(--accent-progress)" />
              <StatCard label="Resolved"       value={stats.resolvedCount}   topColor="var(--accent-resolved)" sub={`Rate: ${stats.resolutionRate}%`} />
              <StatCard label="Rejected"       value={stats.rejectedCount}   topColor="var(--accent-rejected)" />
              <StatCard label="Total Users"    value={stats.totalUsers}      topColor="var(--text-secondary)" />
              <StatCard label="Staff Members"  value={stats.totalStaff}      topColor="var(--accent-admin)" />
              <StatCard label="Resolution"     value={`${stats.resolutionRate}%`} topColor="var(--accent-resolved)" />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <ChartPanel title="CASES BY CATEGORY">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byCategory} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="CASES BY PRIORITY">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'var(--border-strong)' }}
                    >
                      {byPriority.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            {/* Trend Chart */}
            {monthlyTrend.length > 0 && (
              <ChartPanel title="6-MONTH CASE TREND">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyTrend} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <Line type="monotone" dataKey="total" stroke="var(--accent-progress)" strokeWidth={2} dot={{ fill: 'var(--accent-progress)', r: 3 }} name="Total" />
                    <Line type="monotone" dataKey="resolved" stroke="var(--accent-resolved)" strokeWidth={2} dot={{ fill: 'var(--accent-resolved)', r: 3 }} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            )}

            {/* Recent Cases */}
            <div style={{ marginTop: '16px' }}>
              <ChartPanel title="RECENT CASE FILINGS">
                <div>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: '16px', padding: '6px 0', marginBottom: '4px' }}>
                    {['REF NO.', 'TITLE / SUBMITTER', 'STATUS'].map((h) => (
                      <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                  {recentComplaints.map((c, idx) => (
                    <div
                      key={c._id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr auto',
                        gap: '16px',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderTop: idx === 0 ? '1px solid var(--border-subtle)' : '1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent)',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{caseRef(c._id)}</span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                          {c.submittedBy?.name} · {formatDate(c.createdAt).toUpperCase()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={statusConfig[c.status]?.stampClass || 'stamp stamp-neutral'}>{statusConfig[c.status]?.label}</span>
                        <span className={priorityConfig[c.priority]?.stampClass || 'stamp stamp-neutral'}>{c.priority?.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartPanel>
            </div>
          </>
        )}

        {/* ────────────── COMPLAINTS TAB ────────────── */}
        {activeTab === 'complaints' && (
          <>
            {/* Assign Modal */}
            {selectedComplaint && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  borderTop: '4px solid var(--accent-rejected)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  width: '100%',
                  maxWidth: '520px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        {caseRef(selectedComplaint._id)} · ASSIGN HANDLER
                      </span>
                      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
                        {selectedComplaint.title}
                      </h2>
                    </div>
                    <button onClick={() => setSelectedComplaint(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                    {selectedComplaint.description}
                  </p>

                  {selectedComplaint.aiAnalysis && (
                    <div style={{ background: 'color-mix(in srgb, var(--accent-progress) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-progress) 25%, transparent)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: '16px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-progress)', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>◈ AUTO-CLASSIFICATION RESULT</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                        {selectedComplaint.aiAnalysis.category && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            <span style={{ color: 'var(--text-muted)' }}>CATEGORY </span>{selectedComplaint.aiAnalysis.category}
                          </p>
                        )}
                        {selectedComplaint.aiAnalysis.suggestedDepartment && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            <span style={{ color: 'var(--text-muted)' }}>DEPT </span>{selectedComplaint.aiAnalysis.suggestedDepartment}
                          </p>
                        )}
                        {selectedComplaint.aiAnalysis.sentiment && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            <span style={{ color: 'var(--text-muted)' }}>SENTIMENT </span>{selectedComplaint.aiAnalysis.sentiment}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>ASSIGN TO STAFF MEMBER</label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">Select staff member...</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}{s.department ? ` — ${s.department}` : ''}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setSelectedComplaint(null)} style={{ flex: 1, padding: '9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>
                        CANCEL
                      </button>
                      <button
                        onClick={handleAssign}
                        disabled={assigning || !selectedStaff}
                        style={{ flex: 1, padding: '9px', borderRadius: 'var(--radius-md)', border: 'none', background: assigning || !selectedStaff ? 'color-mix(in srgb, var(--accent-rejected) 40%, transparent)' : 'var(--accent-rejected)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', cursor: assigning || !selectedStaff ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        {assigning ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : 'ASSIGN'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search by title, description, or submitter…"
                style={{ ...fieldStyle, paddingLeft: '36px', paddingRight: searchInput ? '36px' : '12px' }}
              />
              {searchInput && (
                <button onClick={clearSearch} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} aria-label="Clear search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['all', 'pending', 'in-progress', 'resolved', 'rejected'].map((f) => {
                const active = statusFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setPage(1); }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${active ? 'var(--accent-rejected)' : 'var(--border-subtle)'}`,
                      background: active ? 'color-mix(in srgb, var(--accent-rejected) 12%, transparent)' : 'var(--bg-surface)',
                      color: active ? 'var(--accent-rejected)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f === 'all' ? 'ALL' : f.toUpperCase().replace('-', ' ')}
                  </button>
                );
              })}
            </div>

            {/* Cases Table */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['REF / TITLE', 'SUBMITTER', 'CATEGORY', 'PRIORITY', 'STATUS', 'DATE', 'ACTIONS'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '10px 14px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((c) => (
                      <tr
                        key={c._id}
                        style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent)', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{caseRef(c._id)}</span>
                          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', margin: 0, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                          {c.assignedTo && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0' }}>→ {c.assignedTo.name}</p>}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>{c.submittedBy?.name}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="stamp stamp-neutral">{c.category}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={priorityConfig[c.priority]?.stampClass || 'stamp stamp-neutral'}>{c.priority?.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <select
                            value={c.status}
                            disabled={updatingStatusId === c._id}
                            onChange={(e) => handleStatusUpdate(c._id, e.target.value)}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-strong)',
                              background: 'var(--bg-elevated)',
                              color: statusConfig[c.status]?.topBorder || 'var(--text-primary)',
                              cursor: 'pointer',
                              outline: 'none',
                              opacity: updatingStatusId === c._id ? 0.5 : 1,
                            }}
                          >
                            <option value="pending">PENDING</option>
                            <option value="in-progress">IN PROGRESS</option>
                            <option value="resolved">RESOLVED</option>
                            <option value="rejected">REJECTED</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(c.createdAt).toUpperCase()}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => { setSelectedComplaint(c); setSelectedStaff(c.assignedTo?._id || ''); }}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--accent-progress)', background: 'color-mix(in srgb, var(--accent-progress) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-progress) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.12s' }}
                            >
                              ASSIGN
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              disabled={deletingId === c._id}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--accent-rejected)', background: 'color-mix(in srgb, var(--accent-rejected) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-rejected) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: deletingId === c._id ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', opacity: deletingId === c._id ? 0.5 : 1, transition: 'all 0.12s' }}
                            >
                              {deletingId === c._id ? '…' : 'DELETE'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredComplaints.length === 0 && (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '6px' }}>NO RECORDS FOUND</p>
                    {searchQuery && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No results for &ldquo;<span style={{ color: 'var(--text-primary)' }}>{searchQuery}</span>&rdquo;</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← PREV</button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>PG {page} / {Math.ceil(total / LIMIT)}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: page * LIMIT >= total ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: page * LIMIT >= total ? 'not-allowed' : 'pointer', opacity: page * LIMIT >= total ? 0.4 : 1 }}>NEXT →</button>
              </div>
            )}
          </>
        )}

        {/* ────────────── USERS TAB ────────────── */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['NAME', 'EMAIL', 'ROLE', 'DEPARTMENT', 'STATUS', 'ACTIONS'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '10px 14px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const roleClass = { admin: 'stamp stamp-admin', staff: 'stamp stamp-staff', user: 'stamp stamp-user' };
                    return (
                      <tr
                        key={u._id}
                        style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent)', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{u.name}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={roleClass[u.role] || 'stamp stamp-neutral'}>{u.role.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={u.isActive ? 'stamp stamp-resolved' : 'stamp stamp-neutral'}>
                            {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            onClick={() => handleToggleUserActive(u._id, u.isActive)}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              color: u.isActive ? 'var(--accent-rejected)' : 'var(--accent-resolved)',
                              background: u.isActive ? 'color-mix(in srgb, var(--accent-rejected) 10%, transparent)' : 'color-mix(in srgb, var(--accent-resolved) 10%, transparent)',
                              border: u.isActive ? '1px solid color-mix(in srgb, var(--accent-rejected) 30%, transparent)' : '1px solid color-mix(in srgb, var(--accent-resolved) 30%, transparent)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '3px 10px',
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                          >
                            {u.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>NO USERS FOUND</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDashboard;
