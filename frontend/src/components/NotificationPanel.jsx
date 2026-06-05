import { useState, useEffect } from 'react';
import { getMyNotifications, markNotificationRead } from '../api/endpoints';

const TYPE_ICONS = {
  kyc_approved: '✅',
  kyc_rejected: '❌',
  interview_scheduled: '📍',
  interview_passed: '🎉',
  interview_failed: '😔',
  unlock_key_sent: '🔑',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await getMyNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div
        className="card-header"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen(!open)}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span
              style={{
                background: '#e74c3c',
                color: '#fff',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </h2>
        <span style={{ fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--primary)',
                    background: n.is_read ? 'transparent' : 'rgba(44, 62, 80, 0.03)',
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, paddingTop: 2 }}>
                    {TYPE_ICONS[n.notification_type] || '📢'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: 14 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {n.created_at ? timeAgo(n.created_at) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
