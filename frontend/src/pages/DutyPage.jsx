import { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { getShiftInfo, acknowledgeTask, exportTasksPDF, exportTasksDOCX } from '../api/endpoints';
import toast from 'react-hot-toast';
import { TaskIcon, CalendarIcon, ClockIcon, CheckIcon, DownloadIcon, PinIcon } from '../components/BrandIcons';

const PRIORITY_STYLES = {
  emergency: { dot: '#dc2626', bg: 'rgba(220,38,38,0.1)', color: '#991b1b', border: 'rgba(220,38,38,0.3)' },
  urgent:    { dot: '#d97706', bg: 'rgba(217,119,6,0.1)', color: '#92400e', border: 'rgba(217,119,6,0.3)' },
  routine:   { dot: '#16a34a', bg: 'rgba(22,163,74,0.1)', color: '#166534', border: 'rgba(22,163,74,0.3)' },
};

const TASK_STATUS_STYLES = {
  assigned:     { bg: 'rgba(18,151,169,0.1)',  color: '#0B5E6B', label: 'Assigned',     icon: <ClockIcon size={12} /> },
  acknowledged: { bg: 'rgba(22,163,74,0.1)',   color: '#166534', label: 'Acknowledged', icon: <CheckIcon size={12} /> },
  completed:    { bg: '#eef2f6',               color: '#475569', label: 'Completed',    icon: <CheckIcon size={12} /> },
};

function shiftColor(time = '') {
  const t = time.toLowerCase();
  if (t.includes('morning') || t.startsWith('6') || t.startsWith('7') || t.startsWith('8'))
    return { bg: 'rgba(18,151,169,0.12)', border: 'rgba(18,151,169,0.35)', text: '#0B5E6B', badge: 'Morning' };
  if (t.includes('evening') || t.startsWith('2') || t.startsWith('14') || t.startsWith('3'))
    return { bg: 'rgba(201,162,75,0.14)',  border: 'rgba(201,162,75,0.4)',  text: '#9C7B2E', badge: 'Evening' };
  if (t.includes('night') || t.startsWith('10') || t.startsWith('22') || t.startsWith('11'))
    return { bg: 'rgba(109,40,217,0.1)',   border: 'rgba(109,40,217,0.3)',  text: '#6d28d9', badge: 'Night' };
  if (t.includes('emergency'))
    return { bg: 'rgba(220,38,38,0.1)',    border: 'rgba(220,38,38,0.3)',   text: '#991b1b', badge: 'Emergency' };
  return { bg: '#eef2f6', border: 'rgba(100,116,139,0.3)', text: '#475569', badge: 'Duty' };
}

export default function DutyPage() {
  const [shifts,  setShifts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('All');

  const fetchShifts = () =>
    getShiftInfo()
      .then(r => setShifts(r.data?.shifts || []))
      .catch(() => toast.error('Could not load duty schedule.'));

  const loadShifts = () => {
    setLoading(true);
    fetchShifts().finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShifts().finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (taskId) => {
    try {
      await acknowledgeTask(taskId);
      toast.success('Task acknowledged!');
      loadShifts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not acknowledge task');
    }
  };

  const exportFile = async (fn, name, msg) => {
    try {
      const res = await fn();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      toast.success(msg);
    } catch { toast.error('Export failed'); }
  };

  const today    = new Date().toISOString().split('T')[0];
  const filtered = filter === 'All'      ? shifts
                 : filter === 'Today'    ? shifts.filter(s => s.shift_date === today)
                 : filter === 'Upcoming' ? shifts.filter(s => s.shift_date > today)
                 : shifts.filter(s => s.shift_date < today);

  const todayCount    = shifts.filter(s => s.shift_date === today).length;
  const upcomingCount = shifts.filter(s => s.shift_date > today).length;
  const pastCount     = shifts.filter(s => s.shift_date < today).length;

  const nextDuty = shifts.find(s => s.shift_date === today && s.task_title)
                || shifts.find(s => s.shift_date >= today && s.task_title)
                || shifts[0];

  return (
    <AppLayout title="My Duty Schedule">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Next Duty hero strip ── */}
        {nextDuty ? (
          <div style={{
            background: 'linear-gradient(120deg, #0B5E6B 0%, #1297A9 100%)',
            borderRadius: 16, padding: '22px 28px', color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
            boxShadow: '0 10px 30px rgba(11,94,107,0.25)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <PulseDot /> Next Duty
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
                {nextDuty.task_title || 'Duty Shift'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12.5, opacity: 0.9 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CalendarIcon size={13} />
                  {new Date(nextDuty.shift_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {nextDuty.shift_date === today && <span style={{ fontSize: 10, background: 'var(--brand-gold)', color: '#142B3D', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>TODAY</span>}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <ClockIcon size={13} /> {nextDuty.shift_time}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <PinIcon size={13} /> {nextDuty.ward || nextDuty.location}
                </span>
              </div>
            </div>
            {nextDuty.task_title && nextDuty.status === 'assigned' ? (
              <button
                onClick={() => handleAcknowledge(nextDuty.id)}
                style={{
                  background: 'var(--brand-gold)', color: '#142B3D', border: 'none', borderRadius: 10,
                  padding: '12px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                }}
              >
                <CheckIcon size={16} /> Acknowledge
              </button>
            ) : nextDuty.task_title && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                <CheckIcon size={12} /> Acknowledged
              </span>
            )}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(120deg, #0B5E6B 0%, #1297A9 100%)', borderRadius: 16, padding: '18px 28px',
            color: '#fff', boxShadow: '0 10px 30px rgba(11,94,107,0.25)', textAlign: 'center',
          }}>
            No duties assigned yet. Your admin will schedule shifts soon.
          </div>
        )}

        {/* ── Summary stats ── */}
        <div className="stats-grid cols-3">
          {[
            { icon: 'task',     label: 'Total',     value: shifts.length, sub: 'Assigned shifts', gold: false },
            { icon: 'calendar', label: 'Today',     value: todayCount,    sub: 'Scheduled today', gold: true },
            { icon: 'clock',    label: 'Upcoming',  value: upcomingCount, sub: 'In your schedule', gold: false },
            { icon: 'check',    label: 'Completed', value: pastCount,     sub: 'Past duties', gold: false },
          ].map(s => {
            const Icon = s.icon === 'task' ? TaskIcon : s.icon === 'calendar' ? CalendarIcon : s.icon === 'clock' ? ClockIcon : CheckIcon;
            return (
              <div key={s.label} className="stat-card">
                <div className="stat-info">
                  <h3>{s.value}</h3>
                  <p>{s.label}</p>
                  <div className="stat-sub">{s.sub}</div>
                </div>
                <div className={`stat-icon${s.gold ? ' gold' : ''}`}><Icon size={22} /></div>
              </div>
            );
          })}
        </div>

        {/* ── Duty table ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TaskIcon size={18} /> Duty Table</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {['All', 'Today', 'Upcoming', 'Completed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '6px 16px', borderRadius: 999, border: '1px solid var(--border)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === f ? 'var(--brand-cyan)' : '#fff',
                  color:      filter === f ? '#fff' : 'var(--text)',
                  boxShadow:  filter === f ? '0 4px 12px rgba(18,151,169,0.3)' : 'none',
                }}>{f}</button>
              ))}
              <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
              <button onClick={() => exportFile(exportTasksPDF, 'duty_schedule.pdf', 'PDF downloaded!')}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <DownloadIcon size={13} /> PDF
              </button>
              <button onClick={() => exportFile(exportTasksDOCX, 'duty_schedule.docx', 'DOCX downloaded!')}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <DownloadIcon size={13} /> DOCX
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading your schedule…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px', background: 'rgba(18,151,169,0.08)', color: '#1297A9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarIcon size={24} />
                </div>
                <strong>No duties found</strong>
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  {filter === 'All' ? 'Your admin will assign duties soon.' : `No ${filter.toLowerCase()} duties.`}
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Task Title</th>
                      <th>Task Type</th>
                      <th>Priority</th>
                      <th>Ward / Location</th>
                      <th>Shift Time</th>
                      <th>Task Status</th>
                      <th>Acknowledge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const ps  = PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.routine;
                      const tss = TASK_STATUS_STYLES[s.status] || TASK_STATUS_STYLES.assigned;
                      const sc  = shiftColor(s.shift_time);
                      const dt  = new Date(s.shift_date + 'T00:00:00');
                      const isToday = s.shift_date === today;
                      return (
                        <tr key={s.id} style={{ background: isToday ? 'rgba(201,162,75,0.09)' : undefined }}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                            {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {isToday && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--brand-gold)', color: '#142B3D', borderRadius: 3, padding: '1px 6px', fontWeight: 700 }}>TODAY</span>}
                          </td>
                          <td style={{ fontSize: 13, fontWeight: 600, maxWidth: 180 }}>
                            {s.task_title || <span style={{ color: '#d1d5db' }}>—</span>}
                            {s.task_notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.task_notes}</div>}
                          </td>
                          <td style={{ fontSize: 12, color: '#6b7280' }}>{s.task_type || '—'}</td>
                          <td>
                            {s.task_title ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ps.dot, display: 'inline-block' }} />
                                {s.priority}
                              </span>
                            ) : <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                          <td style={{ fontSize: 13 }}>{s.ward || s.location}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                              {sc.badge} · {s.shift_time}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: tss.bg, color: tss.color, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              {tss.icon} {tss.label}
                            </span>
                          </td>
                          <td>
                            {s.task_title && s.status === 'assigned' ? (
                              <button
                                onClick={() => handleAcknowledge(s.id)}
                                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--brand-gold)', color: '#142B3D', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(201,162,75,0.35)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <CheckIcon size={13} /> Acknowledge
                              </button>
                            ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function PulseDot() {
  return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-gold)', display: 'inline-block', boxShadow: '0 0 0 4px rgba(201,162,75,0.25)' }} />
  );
}
