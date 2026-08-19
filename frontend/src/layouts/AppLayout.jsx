import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyNotifications, markNotificationRead } from '../api/endpoints';
import {
  DashboardIcon, DocumentsIcon, KeyIcon, CalendarIcon, SettingsIcon, NurseIcon,
  InterviewIcon, IDIcon, HospitalIcon, UserIcon, TaskIcon,
  BellIcon, MenuIcon, LogOutIcon, LockIcon,
} from '../components/BrandIcons';

// Nurse sidebar — items adapt based on access level
const nurseNav = [
  { to: '/dashboard',     label: 'Dashboard',        icon: 'dashboard',  locked: false },
  { to: '/documents',     label: 'My Documents',      icon: 'documents',  locked: false },
  { to: '/requests',      label: 'Delivery Requests', icon: 'task',       locked: true  },
  { to: '/working-shift', label: 'Working Shift',     icon: 'key',        locked: false, preUnlock: true },
  { to: '/duty',          label: 'My Duty',           icon: 'calendar',   shiftOnly: true },
  { to: '/profile',       label: 'Profile Settings',  icon: 'settings',   locked: false },
];

const adminNav = [
  { to: '/admin',                 label: 'Dashboard',            icon: 'dashboard' },
  { to: '/admin/nurses',          label: 'Nurse Registry',       icon: 'nurse' },
  { to: '/admin/interviews',      label: 'Interviews',           icon: 'interview' },
  { to: '/admin/hospital-admins', label: 'Hospital Admins',      icon: 'hospital' },
  { to: '/admin/system-id',       label: 'System ID Generation', icon: 'id' },
  { to: '/profile',               label: 'Profile Settings',     icon: 'settings' },
];

const profileLink = { to: '/profile', label: 'Profile Settings', icon: 'settings' };

const hospitalAdminNav = [
  { to: '/hospital-admin',            label: 'Dashboard',   icon: 'hospital' },
  { to: '/hospital-admin/nurses',     label: 'Nurses',      icon: 'nurse' },
  { to: '/hospital-admin/tasks',      label: 'Task History', icon: 'task' },
  { to: '/hospital-admin/dept-heads', label: 'Dept Heads',  icon: 'user' },
  profileLink,
];

const deptHeadNav = [
  { to: '/dept',       label: 'Dashboard',    icon: 'dashboard' },
  { to: '/dept/nurses', label: 'My Nurses',   icon: 'nurse' },
  { to: '/dept/tasks',  label: 'Task History', icon: 'task' },
  profileLink,
];

const NAV_ICONS = {
  dashboard:  DashboardIcon,
  documents:  DocumentsIcon,
  key:        KeyIcon,
  calendar:   CalendarIcon,
  settings:   SettingsIcon,
  nurse:      NurseIcon,
  interview:  InterviewIcon,
  id:         IDIcon,
  hospital:   HospitalIcon,
  user:       UserIcon,
  task:       TaskIcon,
};

// Route to navigate to when a notification is clicked
function notifRoute(type = '') {
  if (['kyc_approved', 'kyc_rejected', 'reupload_requested', 'document_expiry'].includes(type))
    return '/documents';
  if (['shift_assigned', 'duty_assigned'].includes(type))
    return '/duty';
  return '/dashboard';
}

function notifIcon(type = '') {
  if (type.includes('kyc')) return <DocumentsIcon size={16} />;
  if (type.includes('reupload')) return <LockIcon size={16} />;
  if (type.includes('shift') || type.includes('duty')) return <CalendarIcon size={16} />;
  if (type.includes('interview')) return <InterviewIcon size={16} />;
  return <BellIcon size={16} />;
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
        className="notif-bell"
        onClick={() => { setOpen(o => !o); load(); }}
        title="Notifications"
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-head">
            <span>Notifications</span>
            {unread > 0 && (
              <span className="notif-unread">{unread} unread</span>
            )}
          </div>

          {/* List */}
          {notifs.length === 0 ? (
            <div className="notif-empty">
              <BellIcon size={26} />
              <span>No notifications yet</span>
            </div>
          ) : notifs.slice(0, 15).map(n => (
            <div
              key={n.id}
              className={`notif-item${n.is_read ? '' : ' unread'}`}
              onClick={() => handleClick(n)}
            >
              <div className="notif-item-icon">
                {notifIcon(n.notification_type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-msg">{n.message}</div>
                <div className="notif-item-time">
                  {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!n.is_read && <span className="notif-pip" />}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

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
    : nurseNav.filter(item => (!item.shiftOnly || shiftUnlocked) && !(item.preUnlock && shiftUnlocked));

  const roleLabel = isDeptHead
    ? 'Dept Head'
    : isHospitalAdmin
    ? 'Hospital Admin'
    : user?.role === 'admin'
    ? 'Platform Admin'
    : 'Nurse';

  const roleDetail = isDeptHead
    ? (user?.department || 'Dept Head')
    : isHospitalAdmin
    ? (user?.hospital_name || 'Hospital Admin')
    : user?.role === 'admin'
    ? 'Platform Admin'
    : 'Nurse Account';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <img
            src={`${import.meta.env.BASE_URL}carenium-logo.jpg`}
            alt="Carenium logo"
          />
          <div>
            <span className="logo-text">CARE<em>NIUM</em></span>
            <span className="logo-sub">Nurse Platform</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => {
            const Icon = NAV_ICONS[item.icon] || DashboardIcon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/hospital-admin' || item.to === '/dept'}
                className={({ isActive }) => isActive ? 'active' : ''}
                style={item.locked ? { opacity: 0.65 } : {}}
                title={item.locked ? 'Coming soon' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.locked && (
                  <span className="lock-tag"><LockIcon size={13} /></span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.full_name || user?.email}</strong>
            <span className="role-chip">{roleDetail}</span>
          </div>
          <button className="btn btn-outline btn-full sidebar-signout" onClick={handleLogout}>
            <LogOutIcon size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button className="header-menu-btn" onClick={() => setMobileOpen(o => !o)}>
              <MenuIcon size={22} />
            </button>
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            {/* Notification bell — nurses only */}
            {!isAdmin && <NotificationBell />}
            <span className="role-chip">{roleLabel}</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
