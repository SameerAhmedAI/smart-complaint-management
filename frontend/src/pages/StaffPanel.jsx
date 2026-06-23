import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

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

const StatCard = ({ label, value, icon, colorClass }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClass}`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const StaffPanel = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', resolution: '', note: '' });
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 8;
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: LIMIT };
      if (filter !== 'all') params.status = filter;
      const [statsRes, complaintsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/complaints', { params }),
      ]);
      setStats(statsRes.data.stats);
      setComplaints(complaintsRes.data.complaints);
      setTotal(complaintsRes.data.total);
    } catch {
      toast.error('Failed to load panel data');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive client-side filtered list by applying the debounced keyword
  const filteredComplaints = searchQuery
    ? complaints.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.submittedBy?.name?.toLowerCase().includes(q)
        );
      })
    : complaints;

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

  const openDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setStatusForm({ status: complaint.status, resolution: complaint.resolution || '', note: '' });
  };

  const handleUpdateStatus = async () => {
    if (!statusForm.status) { toast.error('Please select a status'); return; }
    setUpdating(true);
    try {
      await api.put(`/complaints/${selectedComplaint._id}/status`, statusForm);
      toast.success('Complaint updated successfully');
      setSelectedComplaint(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Staff Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your assigned complaints, {user?.name}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Assigned" value={stats.assignedTotal} icon="📋" colorClass="bg-indigo-500/10" />
            <StatCard label="Pending" value={stats.assignedPending} icon="⏳" colorClass="bg-amber-500/10" />
            <StatCard label="In Progress" value={stats.assignedInProgress} icon="🔄" colorClass="bg-blue-500/10" />
            <StatCard label="Resolved" value={stats.assignedResolved} icon="✅" colorClass="bg-emerald-500/10" />
          </div>
        )}

        {/* Resolution Rate */}
        {stats && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Resolution Rate</p>
              <p className="text-white font-bold text-lg">{stats.resolutionRate}%</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${stats.resolutionRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Complaint Update Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-white pr-4">{selectedComplaint.title}</h2>
                <button onClick={() => setSelectedComplaint(null)} className="text-gray-500 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${statusConfig[selectedComplaint.status]?.bg} ${statusConfig[selectedComplaint.status]?.color} ${statusConfig[selectedComplaint.status]?.border}`}>
                    {statusConfig[selectedComplaint.status]?.label}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${priorityConfig[selectedComplaint.priority]?.bg} ${priorityConfig[selectedComplaint.priority]?.color}`}>
                    {selectedComplaint.priority}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300">
                    {selectedComplaint.category}
                  </span>
                </div>

                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Submitted by</p>
                  <p className="text-white text-sm">{selectedComplaint.submittedBy?.name} — <span className="text-gray-400">{selectedComplaint.submittedBy?.email}</span></p>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">{selectedComplaint.description}</p>

                {selectedComplaint.aiAnalysis?.summary && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                    <p className="text-xs text-indigo-400 font-semibold mb-1">🤖 AI Summary</p>
                    <p className="text-indigo-300 text-sm">{selectedComplaint.aiAnalysis.summary}</p>
                    <p className="text-indigo-400 text-xs mt-1">Dept: {selectedComplaint.aiAnalysis.suggestedDepartment} | Sentiment: {selectedComplaint.aiAnalysis.sentiment}</p>
                  </div>
                )}
              </div>

              {/* Update Form */}
              <div className="border-t border-gray-800 pt-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Update Status</h3>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">New Status</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Resolution / Note</label>
                  <textarea
                    value={statusForm.resolution}
                    onChange={(e) => setStatusForm((p) => ({ ...p, resolution: e.target.value }))}
                    placeholder="Describe the resolution or add a note..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Internal Note (optional)</label>
                  <input
                    value={statusForm.note}
                    onChange={(e) => setStatusForm((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Internal note for history..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  >
                    {updating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating...
                      </>
                    ) : 'Update Status'}
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
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'in-progress', 'resolved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Complaints */}
        {filteredComplaints.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">{searchQuery ? '🔍' : '💭'}</div>
            <h3 className="text-white font-medium mb-2">
              {searchQuery ? 'No complaints found' : 'No complaints assigned'}
            </h3>
            <p className="text-gray-400 text-sm">
              {searchQuery
                ? <>No results for &ldquo;<span className="text-gray-300">{searchQuery}</span>&rdquo;</>           
                : 'Complaints assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <div
                key={c._id}
                onClick={() => openDetail(c)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
                      {c.title}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{c.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig[c.status]?.bg} ${statusConfig[c.status]?.color} ${statusConfig[c.status]?.border}`}>
                        {statusConfig[c.status]?.label}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${priorityConfig[c.priority]?.bg} ${priorityConfig[c.priority]?.color}`}>
                        {c.priority}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300">{c.category}</span>
                    </div>
                    {c.submittedBy && (
                      <p className="text-gray-500 text-xs mt-2">By: {c.submittedBy.name}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-gray-500 text-xs">{formatDate(c.createdAt)}</p>
                    <p className="text-blue-400 text-xs mt-2 group-hover:underline">Update →</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 text-sm"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffPanel;
