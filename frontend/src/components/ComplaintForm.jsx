import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Shared styles ───────────────────────────────────── */
const inputBase = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: '2px',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '6px',
};

const ComplaintForm = ({ onSuccess, onClose }) => {
  const [form, setForm] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'description') setCharCount(value.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/complaints', form);
      toast.success('Complaint submitted! AI analysis applied.');
      setForm({ title: '', description: '' });
      setCharCount(0);
      onSuccess?.(data.complaint);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  const focused = (name) => ({
    ...inputBase,
    borderColor: focusedField === name ? 'var(--accent-progress)' : 'var(--border-strong)',
  });

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-strong)',
      borderTop: '4px solid var(--accent-progress)',
      borderRadius: '4px',
      padding: '24px',
      width: '100%',
      maxWidth: '640px',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              NEW CASE SUBMISSION
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '18px',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            File a Complaint
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            AI will auto-categorize and prioritize your submission
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title */}
        <div>
          <label htmlFor="complaint-title" style={labelStyle}>
            Case Title <span style={{ color: 'var(--accent-rejected)' }}>*</span>
          </label>
          <input
            id="complaint-title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            onFocus={() => setFocusedField('title')}
            onBlur={() => setFocusedField(null)}
            placeholder="Brief summary of your complaint…"
            maxLength={200}
            style={focused('title')}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="complaint-description" style={labelStyle}>
            Full Description <span style={{ color: 'var(--accent-rejected)' }}>*</span>
          </label>
          <textarea
            id="complaint-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
            placeholder="Describe your complaint in detail. The more information you provide, the better our AI can categorize and prioritize it…"
            rows={6}
            maxLength={3000}
            style={{ ...focused('description'), resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              MIN. 20 CHARACTERS
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: charCount > 2800 ? 'var(--accent-rejected)' : 'var(--text-muted)' }}>
              {charCount}/3000
            </p>
          </div>
        </div>

        {/* AI Notice */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'color-mix(in srgb, var(--accent-progress) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-progress) 25%, transparent)',
          borderRadius: '2px',
          padding: '10px 12px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-progress)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-progress)', lineHeight: 1.5, letterSpacing: '0.04em' }}>
            AI-POWERED ANALYSIS — Your complaint will be automatically categorized, prioritized, and routed to the correct department using Google Gemini AI.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '2px',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              CANCEL
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            id="submit-complaint-btn"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '2px',
              border: 'none',
              background: loading ? 'color-mix(in srgb, var(--accent-progress) 50%, transparent)' : 'var(--accent-progress)',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ANALYZING WITH AI…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                SUBMIT CASE
              </>
            )}
          </button>
        </div>
      </form>

      {/* Routing note */}
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
        textAlign: 'center',
        marginTop: '14px',
        lineHeight: 1.5,
      }}>
        Your case will be auto-categorized and routed to the appropriate department
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ComplaintForm;
