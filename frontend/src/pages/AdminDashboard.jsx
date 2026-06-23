import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

const statusConfig = {
  pending:       { label: 'Pending',     color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30'   },
  'in-progress': { label: 'In Progress', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30'    },
  resolved:      { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  rejected:      { label: 'Rejected',    color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30'     },
};

const priorityConfig = {
  low:      { color: 'text-gray-400',   bg: 'bg-gray-400/10'   },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-400/10' },
  critical: { color: 'text-red-400',    bg: 'bg-red-400/10'    },
};

const StatCard = ({ label, value, icon, sub }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-2xl">{icon}</span>
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
  </div>
);

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

  // Derive client-side filtered list by applying the debounced keyword
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
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(val.trim());
    }, 300);
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
      // Optimistically update local state so UI reflects change instantly
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

  const tooltipStyle = {
    contentStyle: { background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff' },
    itemStyle: { color: '#e5e7eb' },
    labelStyle: { color: '#9ca3af' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">System-wide overview and management</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800 pb-4">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'complaints', label: '📋 All Complaints' },
            { key: 'users', label: '👥 Users' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Complaints" value={stats.totalComplaints} icon="📋" />
              <StatCard label="Pending" value={stats.pendingCount} icon="⏳" />
              <StatCard label="In Progress" value={stats.inProgressCount} icon="🔄" />
              <StatCard label="Resolved" value={stats.resolvedCount} icon="✅" sub={`Rate: ${stats.resolutionRate}%`} />
              <StatCard label="Rejected" value={stats.rejectedCount} icon="❌" />
              <StatCard label="Total Users" value={stats.totalUsers} icon="👤" />
              <StatCard label="Staff Members" value={stats.totalStaff} icon="👷" />
              <StatCard label="Resolution Rate" value={`${stats.resolutionRate}%`} icon="📈" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Category Bar Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Complaints by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byCategory} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Priority Pie Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Complaints by Priority</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={byPriority}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#6b7280' }}
                    >
                      {byPriority.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Trend Line Chart */}
            {monthlyTrend.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-white mb-4">6-Month Complaint Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyTrend} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Total" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Complaints */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Recent Complaints</h3>
              <div className="space-y-3">
                {recentComplaints.map((c) => (
                  <div key={c._id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{c.submittedBy?.name} · {formatDate(c.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[c.status]?.bg} ${statusConfig[c.status]?.color}`}>
                        {statusConfig[c.status]?.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[c.priority]?.bg} ${priorityConfig[c.priority]?.color}`}>
                        {c.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── COMPLAINTS TAB ─── */}
        {activeTab === 'complaints' && (
          <>
            {/* Assign Modal */}
            {selectedComplaint && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-white pr-4">{selectedComplaint.title}</h2>
                    <button onClick={() => setSelectedComplaint(null)} className="text-gray-500 hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-gray-400 text-sm mb-4">{selectedComplaint.description}</p>

                  {selectedComplaint.aiAnalysis?.summary && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-4">
                      <p className="text-xs text-indigo-400 mb-1">🤖 AI Summary</p>
                      <p className="text-indigo-300 text-sm">{selectedComplaint.aiAnalysis.summary}</p>
                      <p className="text-indigo-400 text-xs mt-1">Suggested Dept: {selectedComplaint.aiAnalysis.suggestedDepartment}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="block text-sm text-gray-300">Assign to Staff Member</label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 text-sm"
                    >
                      <option value="">Select staff member...</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}{s.department ? ` — ${s.department}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedComplaint(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-all">
                        Cancel
                      </button>
                      <button
                        onClick={handleAssign}
                        disabled={assigning || !selectedStaff}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      >
                        {assigning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Assign'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search by title, description, or submitter…"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['all', 'pending', 'in-progress', 'resolved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === f ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Complaints Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Title</th>
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Submitted By</th>
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Category</th>
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Priority</th>
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Date</th>
                      <th className="text-left text-gray-400 font-medium px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((c) => (
                      <tr key={c._id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-white font-medium max-w-[200px] truncate">{c.title}</p>
                          {c.assignedTo && <p className="text-gray-500 text-xs mt-0.5">→ {c.assignedTo.name}</p>}
                        </td>
                        <td className="px-5 py-3 text-gray-300">{c.submittedBy?.name}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">{c.category}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[c.priority]?.bg} ${priorityConfig[c.priority]?.color}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={c.status}
                            disabled={updatingStatusId === c._id}
                            onChange={(e) => handleStatusUpdate(c._id, e.target.value)}
                            className={`text-xs px-2 py-1.5 rounded-lg border bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait
                              ${statusConfig[c.status]?.border} ${statusConfig[c.status]?.color}`}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="in-progress">🔄 In Progress</option>
                            <option value="resolved">✅ Resolved</option>
                            <option value="rejected">❌ Rejected</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(c.createdAt)}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedComplaint(c); setSelectedStaff(c.assignedTo?._id || ''); }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              disabled={deletingId === c._id}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              {deletingId === c._id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredComplaints.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-400 font-medium">No complaints found</p>
                    {searchQuery && (
                      <p className="text-gray-500 text-sm mt-1">
                        No results for &ldquo;<span className="text-gray-300">{searchQuery}</span>&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 text-sm">
                  ← Prev
                </button>
                <span className="text-gray-400 text-sm">Page {page} of {Math.ceil(total / LIMIT)}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total} className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 text-sm">
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-400 font-medium px-5 py-3">Name</th>
                    <th className="text-left text-gray-400 font-medium px-5 py-3">Email</th>
                    <th className="text-left text-gray-400 font-medium px-5 py-3">Role</th>
                    <th className="text-left text-gray-400 font-medium px-5 py-3">Department</th>
                    <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                    <th className="text-left text-gray-400 font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3 text-white font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-gray-400">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-red-500/15 text-red-400' :
                          u.role === 'staff' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{u.department || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${u.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-400'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleUserActive(u._id, u.isActive)}
                          className={`text-xs px-3 py-1 rounded-lg transition-all ${
                            u.isActive
                              ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                              : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
