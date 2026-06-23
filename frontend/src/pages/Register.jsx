import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Shared input/label styles ───────────────────────── */
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

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department,
      });
      toast.success('Account created successfully!');
      const map = { admin: '/admin', staff: '/staff', user: '/dashboard' };
      navigate(map[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const focused = (name) => ({
    ...inputBase,
    borderColor: focusedField === name ? 'var(--accent-progress)' : 'var(--border-strong)',
  });

  const pwMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* ── System header ── */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: '3px 3px 3px 0',
            marginBottom: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <span style={{ position: 'absolute', bottom: 0, left: 0, width: 8, height: 8, background: 'var(--bg-base)', clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-resolved)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: 24, height: '1px', background: 'var(--border-strong)' }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              NEW REGISTRATION
            </span>
            <span style={{ width: 24, height: '1px', background: 'var(--border-strong)' }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '20px',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Create Access Credentials
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            CASETRACK — Complaint Management System
          </p>
        </div>

        {/* ── Form card ── */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          padding: '28px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" style={labelStyle}>
                Full Name <span style={{ color: 'var(--accent-rejected)' }}>*</span>
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g. Sameer Ahmed"
                style={focused('name')}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" style={labelStyle}>
                Email Address <span style={{ color: 'var(--accent-rejected)' }}>*</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                autoComplete="email"
                style={focused('email')}
              />
            </div>

            {/* Role + Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="reg-role" style={labelStyle}>Role</label>
                <select
                  id="reg-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('role')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...focused('role'), appearance: 'none' }}
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-department" style={labelStyle}>Department</label>
                <input
                  id="reg-department"
                  name="department"
                  type="text"
                  value={form.department}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('dept')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. IT"
                  style={focused('dept')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" style={labelStyle}>
                Password <span style={{ color: 'var(--accent-rejected)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Min. 6 characters"
                  style={{ ...focused('password'), paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm-password" style={labelStyle}>
                Confirm Password <span style={{ color: 'var(--accent-rejected)' }}>*</span>
              </label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type={showPass ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                placeholder="Repeat your password"
                style={{
                  ...inputBase,
                  borderColor: pwMismatch
                    ? 'var(--accent-rejected)'
                    : focusedField === 'confirm'
                    ? 'var(--accent-progress)'
                    : 'var(--border-strong)',
                }}
              />
              {pwMismatch && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-rejected)', marginTop: '4px', letterSpacing: '0.04em' }}>
                  PASSWORDS DO NOT MATCH
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit-btn"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '2px',
                border: 'none',
                background: loading ? 'color-mix(in srgb, var(--accent-resolved) 50%, transparent)' : 'var(--accent-resolved)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  REGISTERING…
                </>
              ) : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: 'var(--accent-progress)', textDecoration: 'none', fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '20px', letterSpacing: '0.06em' }}>
          CASETRACK · SMART COMPLAINT MANAGEMENT · SZABIST
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Register;
