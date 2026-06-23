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
    setMenuOpen(false);
  };

  const navLinks = {
    user:  [{ to: '/dashboard', label: 'My Complaints' }],
    staff: [{ to: '/staff',     label: 'Staff Panel'   }],
    admin: [{ to: '/admin',     label: 'Control Center'}],
  };

  const links = user ? (navLinks[user.role] || []) : [];

  const roleStampClass = {
    admin: 'stamp stamp-admin',
    staff: 'stamp stamp-staff',
    user:  'stamp stamp-user',
  };

  const linkStyle = (to) => {
    const isActive = location.pathname === to;
    return {
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
      whiteSpace: 'nowrap',
    };
  };

  const mobileLinkStyle = (to) => {
    const isActive = location.pathname === to;
    return {
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      fontSize: '13px',
      fontWeight: 500,
      textDecoration: 'none',
      display: 'block',
      background: isActive ? 'color-mix(in srgb, var(--accent-progress) 12%, transparent)' : 'transparent',
      color: isActive ? 'var(--accent-progress)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-body)',
      borderLeft: isActive ? '2px solid var(--accent-progress)' : '2px solid transparent',
    };
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      background: 'color-mix(in srgb, var(--bg-surface) 97%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        {/* ── Main bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          gap: '8px',
          minWidth: 0,
        }}>

          {/* ── Logo / Insignia ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 30,
              height: 30,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: '3px 3px 3px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <span style={{
                position: 'absolute', bottom: 0, left: 0, width: 7, height: 7,
                background: 'var(--bg-base)', clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
              }} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-progress)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div style={{ lineHeight: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                CASE<span style={{ color: 'var(--accent-progress)' }}>TRACK</span>
              </span>
              {/* Hide subtitle on very small screens */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: '1px', whiteSpace: 'nowrap' }}>
                COMPLAINT MGMT SYS
              </div>
            </div>
          </Link>

          {/* ── Desktop Nav Links (hidden on mobile via CSS) ── */}
          {user && (
            <div className="nav-desktop-links" style={{ flex: '1 1 auto', justifyContent: 'center', minWidth: 0 }}>
              {links.map((link) => (
                <Link key={link.to} to={link.to} style={linkStyle(link.to)}>
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* ── Right side ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {user ? (
              <>
                <NotificationBell />

                {/* Role stamp — always visible */}
                <span className={roleStampClass[user.role] || 'stamp stamp-neutral'} style={{ flexShrink: 0 }}>
                  {user.role}
                </span>

                {/* User name — hidden below 480px via CSS class */}
                <span className="nav-username" style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.name}
                </span>

                {/* Logout button — icon-only on mobile */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '13px', color: 'var(--text-secondary)',
                    background: 'transparent', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', padding: '5px 8px',
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                    flexShrink: 0,
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
                  <span className="nav-logout-label">Logout</span>
                </button>

                {/* Hamburger — shown on mobile via CSS */}
                {links.length > 0 && (
                  <button
                    className="nav-hamburger"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="Toggle navigation menu"
                  >
                    {menuOpen ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Link to="/login" style={{ padding: '5px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                  Login
                </Link>
                <Link to="/register" style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'var(--accent-progress)', whiteSpace: 'nowrap' }}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile dropdown nav ── */}
      {user && links.length > 0 && (
        <div className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
          {links.map((link) => (
            <Link key={link.to} to={link.to} style={mobileLinkStyle(link.to)} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          {/* Logout in mobile menu too for convenience */}
          <button
            onClick={handleLogout}
            style={{
              marginTop: '4px', padding: '9px 12px', borderRadius: 'var(--radius-md)',
              fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500,
              color: 'var(--accent-rejected)', background: 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              borderLeft: '2px solid transparent',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
