import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyNotifications, markNotificationRead } from '../api/endpoints';

// Nurse sidebar — items adapt based on access level
const nurseNav = [
  { to: '/dashboard',     label: 'Dashboard',        icon: '📊', locked: false },
  { to: '/documents',     label: 'My Documents',      icon: '📄', locked: false },
  { to: '/requests',      label: 'Delivery Requests', icon: '📦', locked: true  },
  { to: '/working-shift', label: 'Working Shift',     icon: '🔒', locked: false },
  { to: '/duty',          label: 'My Duty',           icon: '📋', shiftOnly: true },
  { to: '/profile',       label: 'Profile Settings',  icon: '⚙️', locked: false },
];

const adminNav = [
  { to: '/admin',                label: 'Dashboard',            icon: '📊' },
  { to: '/admin/nurses',         label: 'Nurse Registry',       icon: '👩‍⚕️' },
  { to: '/admin/interviews',     label: 'Interviews',           icon: '🗓️' },
  { to: '/admin/hospital-admins', label: 'Hospital Admins',     icon: '🏥' },
  { to: '/admin/system-id',      label: 'System ID Generation', icon: '🪪' },
  { to: '/profile',              label: 'Profile Settings',     icon: '⚙️' },
];

const profileLink = { to: '/profile', label: 'Profile Settings', icon: '⚙️' };

const hospitalAdminNav = [
  { to: '/hospital-admin',            label: 'Dashboard',   icon: '🏥' },
  { to: '/hospital-admin/nurses',     label: 'Nurses',      icon: '👩‍⚕️' },
  { to: '/hospital-admin/tasks',      label: 'Task History', icon: '📋' },
  { to: '/hospital-admin/dept-heads', label: 'Dept Heads',  icon: '👤' },
  profileLink,
];

const deptHeadNav = [
  { to: '/dept',       label: 'Dashboard',    icon: '🩺' },
  { to: '/dept/nurses', label: 'My Nurses',   icon: '👩‍⚕️' },
  { to: '/dept/tasks',  label: 'Task History', icon: '📋' },
  profileLink,
];

// Route to navigate to when a notification is clicked
function notifRoute(type = '') {
  if (['kyc_approved', 'kyc_rejected', 'reupload_requested', 'document_expiry'].includes(type))
    return '/documents';
  if (['shift_assigned', 'duty_assigned'].includes(type))
    return '/duty';
  return '/dashboard';
}

// ── Notification Bell Dropdown ──────────────────────────────────────────────
function NotificationBell() {
  const navigate = useNavigate();
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = () =>
    getMyNotifications()
      .then(r => {
        // API returns { unread_count: N, notifications: [...] }
        const data = r.data || {};
        setNotifs(Array.isArray(data.notifications) ? data.notifications : []);
        setUnread(data.unread_count || 0);
      })
      .catch(() => {});

  useEffect(() => { load(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    navigate(notifRoute(n.notification_type));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); load(); }}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
          fontSize: 20, lineHeight: 1, color: 'var(--text)',
          transition: 'background 0.15s',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 800, borderRadius: '50%',
            minWidth: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 340, maxHeight: 400, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)', zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>🔔 Notifications</span>
            {unread > 0 && (
              <span style={{
                fontSize: 11, background: '#ef4444', color: '#fff',
                borderRadius: 10, padding: '2px 8px', fontWeight: 700,
              }}>
                {unread} unread
              </span>
            )}
          </div>

          {/* List */}
          {notifs.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              No notifications yet
            </div>
          ) : notifs.slice(0, 15).map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                padding: '12px 18px', cursor: 'pointer',
                background: n.is_read ? '#fff' : '#f0f7ff',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : '#f0f7ff'}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, marginTop: 1 }}>
                  {n.notification_type?.includes('kyc') ? '📋'
                    : n.notification_type?.includes('reupload') ? '⚠️'
                    : n.notification_type?.includes('shift') || n.notification_type?.includes('duty') ? '📅'
                    : n.notification_type?.includes('interview') ? '🗓️'
                    : '🔔'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 600 : 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 5 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App Layout ──────────────────────────────────────────────────────────────
export default function AppLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin  = user?.role === 'admin';

  // Show Duty link when: logged in with full access (JWT) or just unlocked this session
  const shiftUnlocked = user?.access_level === 'full' || user?.shift_unlocked === true;

  const isHospitalAdmin = user?.role === 'admin' && user?.admin_role === 'hospital_admin';
  const isDeptHead      = user?.role === 'admin' && user?.admin_role === 'dept_head';
  const nav = isDeptHead
    ? deptHeadNav
    : isHospitalAdmin
    ? hospitalAdminNav
    : isAdmin
    ? adminNav
    : nurseNav.filter(item => !item.shiftOnly || shiftUnlocked);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>🏥 Carenium</h2>
          <span>Nurse Platform</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => {
            const icon  = (shiftUnlocked && item.shiftIcon)  ? item.shiftIcon  : item.icon;
            const label = (shiftUnlocked && item.shiftLabel) ? item.shiftLabel : item.label;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/hospital-admin' || item.to === '/dept'}
                className={({ isActive }) => isActive ? 'active' : ''}
                style={item.locked ? { opacity: 0.65 } : {}}
                title={item.locked ? 'Coming soon' : undefined}
              >
                {icon} {label}{item.locked ? ' 🔒' : ''}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.full_name || user?.email}</strong>
            <span style={{ textTransform: 'capitalize' }}>
              {isDeptHead
                ? `🩺 ${user?.department || 'Dept Head'}`
                : isHospitalAdmin
                ? `🏥 ${user?.hospital_name || 'Hospital Admin'}`
                : user?.role === 'admin' ? 'Platform Admin' : 'Nurse Account'}
            </span>
          </div>
          <button
            className="btn btn-outline btn-full"
            onClick={handleLogout}
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', fontSize: '13px' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="top-header">
          <h1>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification bell — nurses only */}
            {!isAdmin && <NotificationBell />}
            <span className="badge badge-approved" style={{ textTransform: 'capitalize' }}>
              {isDeptHead ? 'Dept Head' : isHospitalAdmin ? 'Hospital Admin' : user?.role === 'admin' ? 'Platform Admin' : 'Nurse'}
            </span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
