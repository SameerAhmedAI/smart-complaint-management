import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ComplaintForm from '../components/ComplaintForm';

const statusConfig = {
  pending:     { label: 'Pending',     color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20'   },
  'in-progress': { label: 'In Progress', color: 'text-blue-400',  bg: 'bg-blue-400/10',    border: 'border-blue-400/20'    },
  resolved:    { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  rejected:    { label: 'Rejected',    color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'     },
};

const priorityConfig = {
  low:      { color: 'text-gray-400',    bg: 'bg-gray-400/10'    },
  medium:   { color: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
  high:     { color: 'text-orange-400',  bg: 'bg-orange-400/10'  },
  critical: { color: 'text-red-400',     bg: 'bg-red-400/10'     },
};

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
    </div>
  </div>
);

const UserDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 8;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: LIMIT };
      if (selectedFilter !== 'all') params.status = selectedFilter;

      const [statsRes, complaintsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/complaints/my', { params }),
      ]);
      setStats(statsRes.data.stats);
      setComplaints(complaintsRes.data.complaints);
      setTotal(complaintsRes.data.total);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleComplaintSubmitted = () => {
    setShowForm(false);
    fetchData();
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome back, {user?.name} 👋</p>
          </div>
          <button
            id="new-complaint-btn"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Complaint
          </button>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total" value={stats.userTotal} icon="📋" color="bg-indigo-500/10" />
            <StatCard label="Pending" value={stats.userPending} icon="⏳" color="bg-amber-500/10" />
            <StatCard label="In Progress" value={stats.userInProgress} icon="🔄" color="bg-blue-500/10" />
            <StatCard label="Resolved" value={stats.userResolved} icon="✅" color="bg-emerald-500/10" />
            <StatCard label="Rejected" value={stats.userRejected} icon="❌" color="bg-red-500/10" />
          </div>
        )}

        {/* New Complaint Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <ComplaintForm
              onSuccess={handleComplaintSubmitted}
              onClose={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Complaint Detail Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-white pr-4">{selectedComplaint.title}</h2>
                <button onClick={() => setSelectedComplaint(null)} className="text-gray-500 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig[selectedComplaint.status]?.bg} ${statusConfig[selectedComplaint.status]?.color} ${statusConfig[selectedComplaint.status]?.border}`}>
                  {statusConfig[selectedComplaint.status]?.label}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityConfig[selectedComplaint.priority]?.bg} ${priorityConfig[selectedComplaint.priority]?.color}`}>
                  {selectedComplaint.priority?.toUpperCase()} Priority
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300">
                  {selectedComplaint.category}
                </span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-4">{selectedComplaint.description}</p>

              {selectedComplaint.aiAnalysis?.summary && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-indigo-400 mb-1">🤖 AI Analysis</p>
                  <p className="text-indigo-300 text-sm">{selectedComplaint.aiAnalysis.summary}</p>
                  <p className="text-indigo-400 text-xs mt-1">Suggested Dept: {selectedComplaint.aiAnalysis.suggestedDepartment}</p>
                </div>
              )}

              {selectedComplaint.assignedTo && (
                <div className="bg-gray-800 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-400">Assigned to: <span className="text-white font-medium">{selectedComplaint.assignedTo.name}</span>
                    {selectedComplaint.assignedTo.department && ` — ${selectedComplaint.assignedTo.department}`}
                  </p>
                </div>
              )}

              {selectedComplaint.resolution && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Resolution</p>
                  <p className="text-emerald-300 text-sm">{selectedComplaint.resolution}</p>
                </div>
              )}

              <p className="text-gray-600 text-xs mt-4">Submitted {formatDate(selectedComplaint.createdAt)}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'in-progress', 'resolved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => { setSelectedFilter(f); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Complaints List */}
        {complaints.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-white font-medium mb-2">No complaints found</h3>
            <p className="text-gray-400 text-sm mb-6">
              {selectedFilter === 'all' ? "You haven't submitted any complaints yet." : `No ${selectedFilter} complaints.`}
            </p>
            {selectedFilter === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                Submit Your First Complaint
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelectedComplaint(c)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm group-hover:text-indigo-400 transition-colors truncate">
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
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300">
                        {c.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-xs">{formatDate(c.createdAt)}</p>
                    {c.assignedTo && (
                      <p className="text-gray-500 text-xs mt-1">→ {c.assignedTo.name}</p>
                    )}
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
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 text-sm transition-all"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 text-sm transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
