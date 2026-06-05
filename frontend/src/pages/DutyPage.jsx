import { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { getShiftInfo, acknowledgeTask, exportTasksPDF, exportTasksDOCX } from '../api/endpoints';
import toast from 'react-hot-toast';

const PRIORITY_STYLES = {
  emergency: { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5', icon: '🔴' },
  urgent:    { bg: '#fffbeb', color: '#92400e', border: '#fcd34d', icon: '🟡' },
  routine:   { bg: '#f0fdf4', color: '#166534', border: '#86efac', icon: '🟢' },
};

const TASK_STATUS_STYLES = {
  assigned:     { bg: '#eff6ff', color: '#1d4ed8', label: '📋 Assigned'    },
  acknowledged: { bg: '#f0fdf4', color: '#166534', label: '✅ Acknowledged' },
  completed:    { bg: '#f8fafc', color: '#475569', label: '☑️ Completed'   },
};

function shiftColor(time = '') {
  const t = time.toLowerCase();
  if (t.includes('morning') || t.startsWith('6') || t.startsWith('7') || t.startsWith('8'))
    return { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', badge: '🌅 Morning' };
  if (t.includes('evening') || t.startsWith('2') || t.startsWith('14') || t.startsWith('3'))
    return { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', badge: '🌇 Evening' };
  if (t.includes('night') || t.startsWith('10') || t.startsWith('22') || t.startsWith('11'))
    return { bg: '#faf5ff', border: '#c4b5fd', text: '#6d28d9', badge: '🌙 Night' };
  if (t.includes('emergency'))
    return { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', badge: '🚨 Emergency' };
  return { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '✅ Duty' };
}

export default function DutyPage() {
  const [shifts,  setShifts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('All');

  const loadShifts = () => {
    setLoading(true);
    getShiftInfo()
      .then(r => setShifts(r.data?.shifts || []))
      .catch(() => toast.error('Could not load duty schedule.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadShifts(); }, []);

  const handleAcknowledge = async (taskId) => {
    try {
      await acknowledgeTask(taskId);
      toast.success('Task acknowledged!');
      loadShifts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not acknowledge task');
    }
  };

  const today    = new Date().toISOString().split('T')[0];
  const filtered = filter === 'All'      ? shifts
                 : filter === 'Today'    ? shifts.filter(s => s.shift_date === today)
                 : filter === 'Upcoming' ? shifts.filter(s => s.shift_date > today)
                 : shifts.filter(s => s.shift_date < today);

  const todayCount    = shifts.filter(s => s.shift_date === today).length;
  const upcomingCount = shifts.filter(s => s.shift_date > today).length;
  const pastCount     = shifts.filter(s => s.shift_date < today).length;

  return (
    <AppLayout title="My Duty Schedule">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Total',     value: shifts.length,  icon: '📋', color: '#f8fafc', border: '#e2e8f0', text: '#334155' },
            { label: 'Today',     value: todayCount,     icon: '📅', color: '#fef3c7', border: '#fcd34d', text: '#92400e' },
            { label: 'Upcoming',  value: upcomingCount,  icon: '⏭',  color: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
            { label: 'Completed', value: pastCount,      icon: '✅', color: '#f0fdf4', border: '#86efac', text: '#166534' },
          ].map(s => (
            <div key={s.label} style={{ background: s.color, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2>📋 Duty Table</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {['All', 'Today', 'Upcoming', 'Completed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: filter === f ? 'var(--primary)' : '#fff',
                  color:      filter === f ? '#fff'            : 'var(--text)',
                  transition: 'all 0.15s',
                }}>{f}</button>
              ))}
              <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
              <button onClick={async () => {
                try {
                  const res = await exportTasksPDF();
                  const url = URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement('a'); a.href = url; a.download = 'duty_schedule.pdf'; a.click();
                  URL.revokeObjectURL(url);
                  toast.success('PDF downloaded!');
                } catch { toast.error('PDF export failed'); }
              }} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                📄 PDF
              </button>
              <button onClick={async () => {
                try {
                  const res = await exportTasksDOCX();
                  const url = URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement('a'); a.href = url; a.download = 'duty_schedule.docx'; a.click();
                  URL.revokeObjectURL(url);
                  toast.success('DOCX downloaded!');
                } catch { toast.error('DOCX export failed'); }
              }} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                📝 DOCX
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading your schedule…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
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
                      const dt  = new Date(s.shift_date + 'T00:00:00');
                      const isToday = s.shift_date === today;
                      return (
                        <tr key={s.id} style={{ background: isToday ? '#fffbeb' : undefined }}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                            {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {isToday && <span style={{ marginLeft: 6, fontSize: 9, background: '#f59e0b', color: '#fff', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>TODAY</span>}
                          </td>
                          <td style={{ fontSize: 13, fontWeight: 600, maxWidth: 180 }}>
                            {s.task_title || <span style={{ color: '#d1d5db' }}>—</span>}
                            {s.task_notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.task_notes}</div>}
                          </td>
                          <td style={{ fontSize: 12, color: '#6b7280' }}>{s.task_type || '—'}</td>
                          <td>
                            {s.task_title ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, whiteSpace: 'nowrap' }}>
                                {ps.icon} {s.priority}
                              </span>
                            ) : <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                          <td style={{ fontSize: 13 }}>📍 {s.ward || s.location}</td>
                          <td style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>⏰ {s.shift_time}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: tss.bg, color: tss.color, whiteSpace: 'nowrap' }}>
                              {tss.label}
                            </span>
                          </td>
                          <td>
                            {s.task_title && s.status === 'assigned' ? (
                              <button
                                onClick={() => handleAcknowledge(s.id)}
                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                ✅ Acknowledge
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
