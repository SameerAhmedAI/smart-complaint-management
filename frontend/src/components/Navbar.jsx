import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = {
    user:  [{ to: '/dashboard', label: 'My Complaints' }],
    staff: [{ to: '/staff',     label: 'Staff Panel'   }],
    admin: [],
  };

  const links = user ? (navLinks[user.role] || []) : [];

  const roleStampClass = {
    admin: 'stamp stamp-admin',
    staff: 'stamp stamp-staff',
    user:  'stamp stamp-user',
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'color-mix(in srgb, var(--bg-surface) 97%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>

          {/* ── Logo / Insignia ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            {/* Stamped insignia mark: square with clipped corner */}
            <div style={{
              width: 32,
              height: 32,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: '3px 3px 3px 0',   /* clipped bottom-left corner feel */
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Diagonal cut effect via pseudo-like inset */}
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: 8,
                height: 8,
                background: 'var(--bg-base)',
                clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
              }} />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-progress)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}>
                CASE<span style={{ color: 'var(--accent-progress)' }}>TRACK</span>
              </span>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                marginTop: '1px',
              }}>
                COMPLAINT MGMT SYS
              </div>
            </div>
          </Link>

          {/* ── Desktop Nav Links ── */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {links.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      background: isActive ? 'color-mix(in srgb, var(--accent-progress) 15%, transparent)' : 'transparent',
                      color: isActive ? 'var(--accent-progress)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid color-mix(in srgb, var(--accent-progress) 35%, transparent)' : '1px solid transparent',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── Right side ── */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <NotificationBell />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={roleStampClass[user.role] || 'stamp stamp-neutral'}>
                  {user.role}
                </span>
                <span style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {user.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-rejected)';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent-rejected) 40%, transparent)';
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-rejected) 8%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/login"
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all 0.15s',
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  textDecoration: 'none',
                  background: 'var(--accent-progress)',
                  transition: 'all 0.15s',
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
