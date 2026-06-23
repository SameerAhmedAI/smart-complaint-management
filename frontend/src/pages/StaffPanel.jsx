import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

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
const StatCard = ({ label, value, topColor }) => (
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
      fontSize: '32px',
      fontWeight: 600,
      color: topColor,
      lineHeight: 1,
    }}>{value ?? '—'}</p>
  </div>
);

/* ── Case Reference Generator ─────────────────────────── */
const caseRef = (id) => {
  const idStr = String(id ?? '');
  return `CASE-${idStr.padStart(4, '0')}`;
};

/* ── Form field style ─────────────────────────────────── */
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

/* ── StaffPanel ────────────────────────────────────────── */
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
    searchDebounceRef.current = setTimeout(() => setSearchQuery(val.trim()), 300);
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border-strong)', borderTop: '2px solid var(--accent-progress)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              STAFF OPERATIONS
            </span>
            <span style={{ width: 32, height: '1px', background: 'var(--border-strong)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{user?.email}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
            Case Assignment Ledger
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Assigned cases for {user?.name}
          </p>
        </div>

        {/* ── Stat Cards ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <StatCard label="Total Assigned" value={stats.assignedTotal}      topColor="var(--text-muted)" />
            <StatCard label="Pending"        value={stats.assignedPending}    topColor="var(--accent-pending)" />
            <StatCard label="In Progress"    value={stats.assignedInProgress} topColor="var(--accent-progress)" />
            <StatCard label="Resolved"       value={stats.assignedResolved}   topColor="var(--accent-resolved)" />
          </div>
        )}

        {/* ── Resolution Rate ── */}
        {stats && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>RESOLUTION RATE</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 600, color: 'var(--accent-resolved)' }}>{stats.resolutionRate}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px' }}>
              <div style={{
                height: '4px',
                borderRadius: '2px',
                background: `linear-gradient(to right, var(--accent-progress), var(--accent-resolved))`,
                width: `${stats.resolutionRate}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}

        {/* ── Update Modal ── */}
        {selectedComplaint && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderTop: `4px solid ${statusConfig[selectedComplaint.status]?.topBorder || 'var(--border-strong)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.06em' }}>
                    {caseRef(selectedComplaint._id)} — UPDATE STATUS
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '17px', color: 'var(--text-primary)', margin: 0 }}>
                    {selectedComplaint.title}
                  </h2>
                </div>
                <button onClick={() => setSelectedComplaint(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className={statusConfig[selectedComplaint.status]?.stampClass || 'stamp stamp-neutral'}>
                  {statusConfig[selectedComplaint.status]?.label}
                </span>
                <span className={priorityConfig[selectedComplaint.priority]?.stampClass || 'stamp stamp-neutral'}>
                  {selectedComplaint.priority?.toUpperCase()} PRI
                </span>
                <span className="stamp stamp-neutral">{selectedComplaint.category}</span>
              </div>

              {/* Submitted by */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: '12px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  SUBMITTED BY → <span style={{ color: 'var(--text-primary)' }}>{selectedComplaint.submittedBy?.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}> · {selectedComplaint.submittedBy?.email}</span>
                </p>
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
                {selectedComplaint.description}
              </p>

              {selectedComplaint.aiAnalysis && (
                <div style={{ background: 'color-mix(in srgb, var(--accent-progress) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-progress) 25%, transparent)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--accent-progress)', letterSpacing: '0.08em', marginBottom: '8px' }}>◈ AUTO-CLASSIFICATION RESULT</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
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

              {/* ── Update Form ── */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', margin: 0 }}>
                  UPDATE CASE STATUS
                </p>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '6px' }}>NEW STATUS</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
                    style={fieldStyle}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '6px' }}>RESOLUTION / NOTE</label>
                  <textarea
                    value={statusForm.resolution}
                    onChange={(e) => setStatusForm((p) => ({ ...p, resolution: e.target.value }))}
                    placeholder="Describe the resolution or add a note..."
                    rows={3}
                    style={{ ...fieldStyle, resize: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '6px' }}>INTERNAL NOTE (OPTIONAL)</label>
                  <input
                    value={statusForm.note}
                    onChange={(e) => setStatusForm((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Internal note for history..."
                    style={fieldStyle}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: updating ? 'color-mix(in srgb, var(--accent-resolved) 50%, transparent)' : 'var(--accent-resolved)',
                      color: '#fff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: updating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {updating ? (
                      <>
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        UPDATING…
                      </>
                    ) : 'SAVE UPDATE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Search Bar ── */}
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
            style={{
              ...fieldStyle,
              paddingLeft: '36px',
              paddingRight: searchInput ? '36px' : '12px',
            }}
          />
          {searchInput && (
            <button onClick={clearSearch} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'in-progress', 'resolved', 'rejected'].map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${active ? 'var(--accent-progress)' : 'var(--border-subtle)'}`,
                  background: active ? 'color-mix(in srgb, var(--accent-progress) 12%, transparent)' : 'var(--bg-surface)',
                  color: active ? 'var(--accent-progress)' : 'var(--text-secondary)',
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

        {/* ── Complaints Ledger ── */}
        {filteredComplaints.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '48px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '8px' }}>
              {searchQuery ? 'NO MATCHING RECORDS' : 'NO CASES ASSIGNED'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {searchQuery
                ? <>No results for &ldquo;<span style={{ color: 'var(--text-primary)' }}>{searchQuery}</span>&rdquo;</>
                : 'Complaints assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Ledger header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 140px auto',
              gap: '16px',
              padding: '8px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            }}>
              {['REF NO.', 'CASE DESCRIPTION', 'SUBMITTER', 'STATUS / DATE'].map((col) => (
                <span key={col} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>{col}</span>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '4px 16px 2px', opacity: 0.6 }}>
              Reference IDs are persistent record identifiers and may not be sequential.
            </p>

            {filteredComplaints.map((c, idx) => (
              <div
                key={c._id}
                onClick={() => openDetail(c)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 140px auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: idx === 0 ? '1px solid var(--border-subtle)' : 'none',
                  borderRadius: idx === filteredComplaints.length - 1 ? '0 0 var(--radius-sm) var(--radius-sm)' : '0',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {caseRef(c._id)}
                </span>

                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {c.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={priorityConfig[c.priority]?.stampClass || 'stamp stamp-neutral'}>
                      {c.priority?.toUpperCase()} PRI
                    </span>
                    <span className="stamp stamp-neutral">{c.category}</span>
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.submittedBy?.name}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={statusConfig[c.status]?.stampClass || 'stamp stamp-neutral'} style={{ display: 'inline-flex', marginBottom: '6px' }}>
                    {statusConfig[c.status]?.label}
                  </span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                    {formatDate(c.createdAt).toUpperCase()}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-progress)', margin: '3px 0 0', cursor: 'pointer' }}>
                    UPDATE →
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {total > LIMIT && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: page === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              ← PREV
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              PG {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: page * LIMIT >= total ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                cursor: page * LIMIT >= total ? 'not-allowed' : 'pointer',
                opacity: page * LIMIT >= total ? 0.4 : 1,
              }}
            >
              NEXT →
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default StaffPanel;
