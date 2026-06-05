import { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { getNurseProfile, unlockWorkingShift, getShiftInfo } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ── Shift colour coding ─────────────────────────────────────────────────────
function shiftColor(time = '') {
  const t = time.toLowerCase();
  if (t.includes('morning') || t.startsWith('6') || t.startsWith('7') || t.startsWith('8'))
    return { bg: '#eff6ff', border: '#93c5fd', label: '#1d4ed8', badge: 'Morning' };
  if (t.includes('evening') || t.startsWith('2') || t.startsWith('14') || t.startsWith('3'))
    return { bg: '#fff7ed', border: '#fdba74', label: '#c2410c', badge: 'Evening' };
  if (t.includes('night') || t.startsWith('10') || t.startsWith('22') || t.startsWith('11'))
    return { bg: '#faf5ff', border: '#c4b5fd', label: '#6d28d9', badge: 'Night' };
  if (t.includes('emergency'))
    return { bg: '#fef2f2', border: '#fca5a5', label: '#b91c1c', badge: 'Emergency' };
  return { bg: '#f0fdf4', border: '#86efac', label: '#166534', badge: 'Shift' };
}

// ── 3D Flip Nurse ID Card ───────────────────────────────────────────────────
function NurseIDCard({ card, nurse }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: '1000px', width: '100%', maxWidth: 480, margin: '0 auto' }}>
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%', height: 220, position: 'relative', cursor: 'pointer',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18, backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #0f2f6e 0%, #1a6fa8 60%, #22b5c0 100%)',
          padding: 24, boxShadow: '0 12px 40px rgba(15,47,110,0.35)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', right: 40, top: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Carenium Health</div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{card.nurse_name}</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{card.assigned_position}</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 10px',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <span style={{ fontSize: 24 }}>🏥</span>
            </div>
          </div>

          <div style={{ zIndex: 1 }}>
            <div style={{
              background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 14px',
              fontFamily: "'Courier New', monospace", letterSpacing: 3,
              color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10,
              display: 'inline-block',
            }}>
              {card.unique_id}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                Valid: {card.valid_from} — {card.valid_upto}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Tap to flip</span> <span style={{ fontSize: 14 }}>↩</span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18,
          backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
          background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 60%, #14b8a6 100%)',
          padding: 24, boxShadow: '0 12px 40px rgba(15,78,74,0.35)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ position: 'absolute', left: -20, bottom: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Nurse Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 0' }}>
              {[
                { label: 'Registration No.', value: card.registration_number },
                { label: 'Phone',            value: nurse?.phone || '—' },
                { label: 'Specialization',   value: card.assigned_position },
                { label: 'Email',            value: nurse?.email || '—' },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{row.label}</div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 2 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Valid: {card.valid_from} – {card.valid_upto}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>↩ Tap to flip</div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
        🪪 Tap the card to see front / back
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function WorkingShift() {
  const { updateAccessLevel } = useAuth();
  const [loading,   setLoading]   = useState(true);
  const [profile,   setProfile]   = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [key,       setKey]       = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const loadProfile = () =>
    getNurseProfile()
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Could not load profile.'));

  const loadShiftInfo = () =>
    getShiftInfo()
      .then(r => setShiftData(r.data))
      .catch(() => {});

  useEffect(() => {
    Promise.all([loadProfile(), loadShiftInfo()]).finally(() => setLoading(false));
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!key.trim()) return toast.error('Please enter your CARE ID.');
    setUnlocking(true);
    try {
      await unlockWorkingShift({ key: key.trim() });
      toast.success('🎉 Access activated! Welcome to Carenium.');
      updateAccessLevel('full');
      await loadShiftInfo();
      setProfile(prev => ({ ...prev, care_id_verified: true, shift_unlocked: true }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid CARE ID.');
      loadProfile();
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Working Shift">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      </AppLayout>
    );
  }

  // ── FULLY ACTIVATED — redirect to dashboard (Stage 3 workspace) ─────────
  if (profile?.care_id_verified || profile?.shift_unlocked) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── LOCKED OUT ────────────────────────────────────────────────────────────
  if (profile?.is_locked_out) {
    return (
      <AppLayout title="Working Shift">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
          <div className="card" style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: '48px 32px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
              <h2 style={{ marginBottom: 12, color: '#dc2626' }}>Account Temporarily Locked</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                You have entered the wrong CARE ID <strong>3 times</strong>.<br /><br />
                Please check the CARE ID in your registered email and try again after <strong>24 hours</strong>.<br /><br />
                Contact the admin to reset your lockout.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── CARE ID ENTRY ─────────────────────────────────────────────────────────
  if (!profile?.care_id_verified && !profile?.shift_unlocked) {
    const attemptsUsed = profile?.care_id_attempts || 0;
    const attemptsLeft = Math.max(0, 3 - attemptsUsed);
    return (
      <AppLayout title="Working Shift">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: '48px 32px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
              <h2 style={{ marginBottom: 8 }}>This Section is Locked</h2>
              {!profile?.care_id_assigned ? (
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Your CARE ID will be emailed once you are selected after your interview.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
                    Enter the CARE ID received in your registered email to unlock full access.
                  </p>
                  <form onSubmit={handleUnlock}>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <input
                        type="text" placeholder="CARE-2026-XXXX"
                        value={key} onChange={e => setKey(e.target.value.toUpperCase())}
                        style={{ textAlign: 'center', fontSize: 18, fontFamily: "'Courier New', monospace", letterSpacing: 2, padding: '14px 16px' }}
                      />
                    </div>
                    {attemptsUsed > 0 && (
                      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c2410c' }}>
                        ⚠️ {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before 24-hour lockout
                      </div>
                    )}
                    <button className="btn btn-primary btn-full" type="submit" disabled={unlocking}>
                      {unlocking ? <><span className="spinner" /> Verifying…</> : '🔓 Unlock Full Access'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── FULL ACTIVATED DASHBOARD ──────────────────────────────────────────────
  const card   = shiftData?.nurse_id_card;
  const shifts = shiftData?.shifts || [];
  const today  = new Date().toISOString().split('T')[0];
  const todayShift     = shifts.find(s => s.shift_date === today);
  const upcomingShifts = shifts.filter(s => s.shift_date >= today).slice(0, 3);

  return (
    <AppLayout title="My Workspace">

      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(120deg, #0f2f6e 0%, #1a6fa8 100%)',
        borderRadius: 16, padding: '20px 28px', marginBottom: 24, color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 8px 24px rgba(15,47,110,0.2)',
      }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 4 }}>Welcome back 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{profile?.full_name || profile?.email}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{profile?.specialization || 'Carenium Staff Nurse'} · Full Access Active</div>
        </div>
        <div style={{ fontSize: 48 }}>🏥</div>
      </div>

      {/* ── Stat Cards Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          {
            icon: '📅', label: 'Today\'s Shift',
            value: todayShift ? todayShift.shift_time : 'None Assigned',
            sub:   todayShift ? todayShift.location   : 'Check back later',
            color: '#eff6ff', border: '#93c5fd',
          },
          {
            icon: '📋', label: 'Total Duties',
            value: shifts.length,
            sub:   'Assigned shifts',
            color: '#f0fdf4', border: '#86efac',
          },
          {
            icon: '⏰', label: 'Upcoming Shifts',
            value: upcomingShifts.length,
            sub:   'In your schedule',
            color: '#faf5ff', border: '#c4b5fd',
          },
        ].map(s => (
          <div key={s.label} style={{
            background: s.color, border: `1px solid ${s.border}`,
            borderRadius: 14, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, margin: '4px 0', color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ID Card + Upcoming Shifts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

        {/* ID Card */}
        <div className="card">
          <div className="card-header"><h2>🪪 Your Nurse ID</h2></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {card
              ? <NurseIDCard card={card} nurse={profile} />
              : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>ID card data not available yet.</p>
            }
          </div>
        </div>

        {/* Upcoming Shifts */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>📅 Upcoming Shifts</h2>
            <Link to="/duty" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {upcomingShifts.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                No upcoming shifts assigned yet.<br />Admin will assign duties soon.
              </div>
            ) : upcomingShifts.map((s, i) => {
              const col = shiftColor(s.shift_time);
              const isToday = s.shift_date === today;
              return (
                <div key={s.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < upcomingShifts.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 7, flexShrink: 0,
                    background: col.label,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                        {new Date(s.shift_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: '#22c55e', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>TODAY</span>}
                      </span>
                      <span style={{ fontSize: 11, background: col.bg, color: col.label, border: `1px solid ${col.border}`, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                        {col.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏰ {s.shift_time}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {s.location}</div>
                    {s.task_notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>📝 {s.task_notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card">
        <div className="card-header"><h2>⚡ Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/duty"      className="btn btn-primary">📋 View All Duties</Link>
          <Link to="/documents" className="btn btn-outline">📄 My Documents</Link>
          <Link to="/dashboard" className="btn btn-outline">📊 Dashboard</Link>
        </div>
      </div>
    </AppLayout>
  );
}
