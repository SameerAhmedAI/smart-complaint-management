import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ComplaintForm from '../components/ComplaintForm';

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

/* ── UserDashboard ────────────────────────────────────── */
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleComplaintSubmitted = () => {
    setShowForm(false);
    fetchData();
  };

  const formatDate = (d) => {
    if (!d) return '';
    
    let date;
    if (d instanceof Date) {
      date = d;
    } else {
      date = new Date(d);
      if (isNaN(date.getTime())) {
        let str = String(d).replace(' ', 'T');
        str = str.replace(/\.(\d{3})\d+/, '.$1');
        date = new Date(str);
      }
    }
    
    if (isNaN(date.getTime())) return 'INVALID DATE';
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };



  if (loading && !stats) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border-strong)', borderTop: '2px solid var(--accent-progress)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const filters = ['all', 'pending', 'in-progress', 'resolved', 'rejected'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', width: '100%', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px', boxSizing: 'border-box', width: '100%' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                CITIZEN PORTAL
              </span>
              <span style={{ width: 32, height: '1px', background: 'var(--border-strong)' }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                wordBreak: 'break-all',
              }}>
                {user?.email}
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '22px',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Case File Registry
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Welcome back, {user?.name}
            </p>
          </div>
          <button
            id="new-complaint-btn"
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--accent-progress)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-heading)',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'opacity 0.15s',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            FILE NEW COMPLAINT
          </button>
        </div>

        {/* ── Stat Cards ── */}
        {stats && (
          <div className="stat-grid" style={{ marginBottom: '28px' }}>
            <StatCard label="Total Filed"   value={stats.userTotal}      topColor="var(--text-muted)" />
            <StatCard label="Pending"       value={stats.userPending}    topColor="var(--accent-pending)" />
            <StatCard label="In Progress"   value={stats.userInProgress} topColor="var(--accent-progress)" />
            <StatCard label="Resolved"      value={stats.userResolved}   topColor="var(--accent-resolved)" />
            <StatCard label="Rejected"      value={stats.userRejected}   topColor="var(--accent-rejected)" />
          </div>
        )}

        {/* ── New Complaint Modal ── */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <ComplaintForm onSuccess={handleComplaintSubmitted} onClose={() => setShowForm(false)} />
          </div>
        )}

        {/* ── Complaint Detail Modal ── */}
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
              maxHeight: '82vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {caseRef(selectedComplaint._id)}
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '17px', color: 'var(--text-primary)', margin: 0 }}>
                    {selectedComplaint.title}
                  </h2>
                </div>
                <button onClick={() => setSelectedComplaint(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                <span className={statusConfig[selectedComplaint.status]?.stampClass || 'stamp stamp-neutral'}>
                  {statusConfig[selectedComplaint.status]?.label}
                </span>
                <span className={priorityConfig[selectedComplaint.priority]?.stampClass || 'stamp stamp-neutral'}>
                  {selectedComplaint.priority?.toUpperCase()} PRI
                </span>
                <span className="stamp stamp-neutral">{selectedComplaint.category}</span>
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                {selectedComplaint.description}
              </p>

              {selectedComplaint.aiAnalysis && (
                <div style={{ background: 'color-mix(in srgb, var(--accent-progress) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-progress) 25%, transparent)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '12px' }}>
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

              {selectedComplaint.assignedTo && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ASSIGNED → <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedComplaint.assignedTo.name}</span>
                    {selectedComplaint.assignedTo.department && ` · ${selectedComplaint.assignedTo.department}`}
                  </p>
                </div>
              )}

              {selectedComplaint.resolution && (
                <div style={{ background: 'color-mix(in srgb, var(--accent-resolved) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-resolved) 25%, transparent)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--accent-resolved)', letterSpacing: '0.08em', marginBottom: '6px' }}>◈ RESOLUTION</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedComplaint.resolution}</p>
                </div>
              )}

              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
                FILED {formatDate(selectedComplaint.createdAt).toUpperCase()}
              </p>
            </div>
          </div>
        )}

        {/* ── Filter Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {filters.map((f) => {
            const active = selectedFilter === f;
            const label = f === 'all' ? 'ALL' : f.toUpperCase().replace('-', ' ');
            return (
              <button
                key={f}
                onClick={() => { setSelectedFilter(f); setPage(1); }}
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
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Complaints Ledger ── */}
        {complaints.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '48px',
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '8px' }}>NO RECORDS FOUND</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {selectedFilter === 'all' ? "You haven't submitted any complaints yet." : `No ${selectedFilter} complaints.`}
            </p>
            {selectedFilter === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  background: 'var(--accent-progress)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                FILE FIRST COMPLAINT
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Ledger header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr auto',
              gap: '16px',
              padding: '8px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            }}>
              {['REF NO.', 'CASE DESCRIPTION', 'STATUS / DATE'].map((col) => (
                <span key={col} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {col}
                </span>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '4px 16px 2px', opacity: 0.6 }}>
              Reference IDs are persistent record identifiers and may not be sequential.
            </p>
            {complaints.map((c, idx) => (
              <div
                key={c._id}
                onClick={() => setSelectedComplaint(c)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: idx === 0 ? '1px solid var(--border-subtle)' : 'none',
                  borderRadius: idx === complaints.length - 1 ? '0 0 var(--radius-sm) var(--radius-sm)' : '0',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
              >
                {/* Ref number */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {caseRef(c._id)}
                </span>

                {/* Title + description */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    margin: '0 0 3px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.title}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 8px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {c.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={priorityConfig[c.priority]?.stampClass || 'stamp stamp-neutral'}>
                      {c.priority?.toUpperCase()} PRI
                    </span>
                    <span className="stamp stamp-neutral">{c.category}</span>
                  </div>
                </div>

                {/* Status + date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={statusConfig[c.status]?.stampClass || 'stamp stamp-neutral'} style={{ display: 'inline-flex', marginBottom: '6px' }}>
                    {statusConfig[c.status]?.label}
                  </span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                    {formatDate(c.createdAt).toUpperCase()}
                  </p>
                  {c.assignedTo && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      → {c.assignedTo.name}
                    </p>
                  )}
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

export default UserDashboard;
