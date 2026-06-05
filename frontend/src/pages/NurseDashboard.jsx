import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { getNurseProfile, getShiftInfo, getMyDocuments } from '../api/endpoints';
import toast from 'react-hot-toast';

// ── Onboarding Steps ────────────────────────────────────────────────────────
const STEPS = ['Pending', 'KYC Review', 'Interview', 'Active'];

function stepIndex(profile) {
  if (!profile) return 0;
  if (profile.shift_unlocked || profile.care_id_verified) return 4;
  if (['PASSED', 'SELECTED'].includes(profile.interview_status)) return 3;
  if (profile.interview_status === 'SCHEDULED') return 2;
  if (profile.is_verified) return 2;
  return 1;
}

// ── Shift colour helper ─────────────────────────────────────────────────────
function shiftColor(time = '') {
  const t = time.toLowerCase();
  if (t.includes('morning') || t.startsWith('6') || t.startsWith('7'))
    return { bg: '#eff6ff', border: '#93c5fd', label: '#1d4ed8', badge: 'Morning' };
  if (t.includes('evening') || t.startsWith('2') || t.startsWith('14'))
    return { bg: '#fff7ed', border: '#fdba74', label: '#c2410c', badge: 'Evening' };
  if (t.includes('night') || t.startsWith('10') || t.startsWith('22'))
    return { bg: '#faf5ff', border: '#c4b5fd', label: '#6d28d9', badge: 'Night' };
  if (t.includes('emergency'))
    return { bg: '#fef2f2', border: '#fca5a5', label: '#b91c1c', badge: 'Emergency' };
  return { bg: '#f0fdf4', border: '#86efac', label: '#166534', badge: 'Shift' };
}

// ── 3D Flip Nurse ID Card ───────────────────────────────────────────────────
function NurseIDCard({ card, nurse }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: '1000px', width: '100%', maxWidth: 460, margin: '0 auto' }}>
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%', height: 210, position: 'relative', cursor: 'pointer',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16, backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #0f2f6e 0%, #1a6fa8 60%, #22b5c0 100%)',
          padding: 22, boxShadow: '0 10px 32px rgba(15,47,110,0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -24, top: -24, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ zIndex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Carenium Health</div>
            <div style={{ color: '#fff', fontSize: 19, fontWeight: 800, lineHeight: 1.2 }}>{card.nurse_name}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 3 }}>{card.assigned_position}</div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 7, padding: '7px 12px', fontFamily: "'Courier New', monospace", letterSpacing: 3, color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'inline-block' }}>
              {card.unique_id}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Valid: {card.valid_from} — {card.valid_upto}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Tap to flip ↩</span>
            </div>
          </div>
        </div>
        {/* BACK */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 60%, #14b8a6 100%)',
          padding: 22, boxShadow: '0 10px 32px rgba(15,78,74,0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Nurse Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 0' }}>
              {[
                { label: 'Reg. No.', value: card.registration_number },
                { label: 'Phone',    value: nurse?.phone || '—' },
                { label: 'Specialization', value: card.assigned_position },
                { label: 'Email',    value: nurse?.email || '—' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>{r.label}</div>
                  <div style={{ color: '#fff', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Valid: {card.valid_from} – {card.valid_upto}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>↩ Tap to flip</span>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>🪪 Tap the card to see front / back</p>
    </div>
  );
}

// ── Stage 1 — KYC Onboarding ────────────────────────────────────────────────
function Stage1View({ profile, docs }) {
  const idx        = stepIndex(profile);
  const totalDocs  = 5;
  const uniqueTypes = [...new Set(docs?.map(d => d.document_type) || [])];
  const uploadedDocs = uniqueTypes.length;
  const allUploaded  = uploadedDocs >= totalDocs;

  return (
    <>
      {/* Welcome */}
      <div style={{ background: 'linear-gradient(120deg,#0f2f6e,#1a6fa8)', borderRadius: 14, padding: '18px 24px', marginBottom: 22, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>Welcome back 👋</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{profile?.full_name || profile?.email}</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>Account Status: <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 8px', fontWeight: 700 }}>KYC Pending</span></div>
        </div>
        <div style={{ fontSize: 40 }}>📋</div>
      </div>

      {/* Onboarding Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>📍 Onboarding Progress</h2></div>
        <div className="card-body">
          <div className="status-steps">
            {STEPS.map((step, i) => (
              <div style={{ display: 'contents' }} key={step}>
                {i > 0 && <div className={`step-line ${i < idx ? 'done' : ''}`} />}
                <div className={`step ${i < idx ? 'done' : i + 1 === idx ? 'active' : ''}`}>
                  <div className="step-dot">{i < idx ? '✓' : i + 1}</div>
                  <span className="step-label">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>📄 Document Upload Status</h2></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: allUploaded ? '#166534' : '#c2410c' }}>
                {uploadedDocs} / {totalDocs}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Documents uploaded</div>
            </div>
            <div style={{
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: allUploaded ? '#f0fdf4' : '#fff7ed',
              color: allUploaded ? '#166534' : '#c2410c',
              border: `1px solid ${allUploaded ? '#86efac' : '#fed7aa'}`,
            }}>
              {allUploaded ? '✅ All documents submitted' : '⚠️ Incomplete — please upload all documents'}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 14, height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(uploadedDocs / totalDocs) * 100}%`, background: allUploaded ? '#22c55e' : '#f59e0b', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h2>⚡ Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12 }}>
          <Link to="/documents" className="btn btn-primary">📄 Upload Documents</Link>
          <Link to="/working-shift" className="btn btn-outline">🔒 Working Shift</Link>
        </div>
      </div>
    </>
  );
}

// ── Stage 1b — KYC Approved, Awaiting Interview ────────────────────────────
function Stage1bView({ profile }) {
  const idx = stepIndex(profile);

  return (
    <>
      {/* KYC Approved Banner */}
      <div style={{ background: 'linear-gradient(120deg,#14532d,#16a34a)', borderRadius: 14, padding: '20px 26px', marginBottom: 22, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Welcome, {profile?.full_name || profile?.email}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>✅ KYC Approved!</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your identity documents have been verified. Awaiting interview scheduling.</div>
        </div>
        <div style={{ fontSize: 44 }}>🎉</div>
      </div>

      {/* Onboarding Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>📍 Onboarding Progress</h2></div>
        <div className="card-body">
          <div className="status-steps">
            {STEPS.map((step, i) => (
              <div style={{ display: 'contents' }} key={step}>
                {i > 0 && <div className={`step-line ${i < idx ? 'done' : ''}`} />}
                <div className={`step ${i < idx ? 'done' : i + 1 === idx ? 'active' : ''}`}>
                  <div className="step-dot">{i < idx ? '✓' : i + 1}</div>
                  <span className="step-label">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h2>⚡ Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12 }}>
          <Link to="/working-shift" className="btn btn-outline">🔒 Working Shift</Link>
        </div>
      </div>
    </>
  );
}

// ── Stage 2 — Awaiting CARE ID ──────────────────────────────────────────────
function Stage2View({ profile }) {
  const navigate  = useNavigate();
  const iStatus   = profile?.interview_status || 'PENDING';
  const isPassed  = ['PASSED', 'SELECTED'].includes(iStatus);

  return (
    <>
      {/* KYC Approved Banner */}
      <div style={{ background: 'linear-gradient(120deg,#14532d,#16a34a)', borderRadius: 14, padding: '20px 26px', marginBottom: 22, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Welcome, {profile?.full_name || profile?.email}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>✅ KYC Approved!</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your identity documents have been verified.</div>
        </div>
        <div style={{ fontSize: 44 }}>🎉</div>
      </div>

      {/* Interview Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>🗓 Interview Status</h2></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              background: isPassed ? '#f0fdf4' : '#fef3c7',
              color:      isPassed ? '#166534' : '#92400e',
              border: `1px solid ${isPassed ? '#86efac' : '#fcd34d'}`,
            }}>
              {isPassed ? '✅ Interview Passed / Selected' : `⏳ Status: ${iStatus}`}
            </div>
            {isPassed && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Check your notifications for your CARE ID status.</span>}
          </div>
        </div>
      </div>

      {/* Onboarding recap */}
      <div className="card">
        <div className="card-header"><h2>📍 Your Journey</h2></div>
        <div className="card-body">
          <div className="status-steps">
            {STEPS.map((step, i) => (
              <div style={{ display: 'contents' }} key={step}>
                {i > 0 && <div className="step-line done" />}
                <div className={`step ${i < 3 ? 'done' : 'active'}`}>
                  <div className="step-dot">{i < 3 ? '✓' : '4'}</div>
                  <span className="step-label">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Stage 3 — Full Access Workspace ─────────────────────────────────────────
function Stage3View({ profile, shiftData }) {
  const [kycExpanded, setKycExpanded] = useState(false);
  const card         = shiftData?.nurse_id_card;
  const shifts       = shiftData?.shifts || [];
  const today        = new Date().toISOString().split('T')[0];
  const todayShift   = shifts.find(s => s.shift_date === today);
  const upcoming     = shifts.filter(s => s.shift_date >= today).slice(0, 3);

  return (
    <>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(120deg,#0f2f6e 0%,#1a6fa8 100%)', borderRadius: 16, padding: '20px 28px', marginBottom: 22, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 24px rgba(15,47,110,0.2)' }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Welcome back 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{profile?.full_name || profile?.email}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{profile?.specialization || 'Carenium Staff Nurse'} · <span style={{ color: '#86efac', fontWeight: 700 }}>Full Access Active</span></div>
        </div>
        <div style={{ fontSize: 48 }}>🏥</div>
      </div>

      {/* Collapsible KYC tracker */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setKycExpanded(e => !e)}
          style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          ✅ Onboarding Complete — all 4 stages passed {kycExpanded ? '▲' : '▼'}
        </button>
        {kycExpanded && (
          <div className="card" style={{ marginTop: 10 }}>
            <div className="card-body">
              <div className="status-steps">
                {STEPS.map((step, i) => (
                  <div style={{ display: 'contents' }} key={step}>
                    {i > 0 && <div className="step-line done" />}
                    <div className="step done">
                      <div className="step-dot">✓</div>
                      <span className="step-label">{step}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '📅', label: "Today's Shift", value: todayShift ? todayShift.shift_time : 'None Assigned', sub: todayShift ? todayShift.location : 'Check back later', color: '#eff6ff', border: '#93c5fd' },
          { icon: '📋', label: 'Total Duties',  value: shifts.length, sub: 'Assigned shifts', color: '#f0fdf4', border: '#86efac' },
          { icon: '⏰', label: 'Upcoming',       value: upcoming.length, sub: 'In your schedule', color: '#faf5ff', border: '#c4b5fd' },
        ].map(s => (
          <div key={s.label} style={{ background: s.color, border: `1px solid ${s.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, margin: '4px 0', color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ID Card + Upcoming Shifts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div className="card">
          <div className="card-header"><h2>🪪 Your Nurse ID</h2></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {card ? <NurseIDCard card={card} nurse={profile} /> : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>ID card not available yet.</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>📅 Upcoming Shifts</h2>
            <Link to="/duty" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {upcoming.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                No upcoming shifts yet.<br />Admin will assign duties soon.
              </div>
            ) : upcoming.slice(0, 3).map((s, i) => {
              const col = shiftColor(s.shift_time);
              const isToday = s.shift_date === today;
              const PBADGE = { emergency: { bg: '#fef2f2', color: '#b91c1c', icon: '🔴' }, urgent: { bg: '#fffbeb', color: '#92400e', icon: '🟡' }, routine: { bg: '#f0fdf4', color: '#166534', icon: '🟢' } };
              const pb = PBADGE[s.priority] || PBADGE.routine;
              return (
                <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < Math.min(upcoming.length, 3) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.label, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                        {new Date(s.shift_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {isToday && <span style={{ marginLeft: 6, fontSize: 9, background: '#22c55e', color: '#fff', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>TODAY</span>}
                      </span>
                      <span style={{ fontSize: 10, background: col.bg, color: col.label, border: `1px solid ${col.border}`, borderRadius: 5, padding: '1px 6px', fontWeight: 600 }}>{col.badge}</span>
                    </div>
                    {s.task_title && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.task_title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: pb.bg, color: pb.color, borderRadius: 5, padding: '1px 6px' }}>{pb.icon} {s.priority}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏰ {s.shift_time} · 📍 {s.ward || s.location}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h2>⚡ Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link to="/duty"      className="btn btn-primary">📋 View All Duties</Link>
          <Link to="/documents" className="btn btn-outline">📄 My Documents</Link>
          <Link to="/requests"  className="btn btn-outline">📦 Create Delivery Request</Link>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔒 Delivery requests are managed by your hospital admin</span>
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard Component ─────────────────────────────────────────────────
export default function NurseDashboard() {
  const [loading,   setLoading]   = useState(true);
  const [profile,   setProfile]   = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [docs,      setDocs]      = useState([]);

  useEffect(() => {
    const profileReq = getNurseProfile()
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Could not load profile.'));

    const docsReq = getMyDocuments()
      .then(r => setDocs(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

    Promise.all([profileReq, docsReq]).then(() => {
      // Only load shift data if unlocked
      const p = profile;
      return;
    }).finally(() => setLoading(false));
  }, []);

  // Load shift info once profile is known
  useEffect(() => {
    if (profile?.shift_unlocked || profile?.care_id_verified) {
      getShiftInfo()
        .then(r => setShiftData(r.data))
        .catch(() => {});
    }
  }, [profile?.shift_unlocked, profile?.care_id_verified]);

  if (loading) {
    return (
      <AppLayout title="My Dashboard">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      </AppLayout>
    );
  }

  // ── Determine Stage ──────────────────────────────────────────────────────
  const isFullAccess    = profile?.shift_unlocked || profile?.care_id_verified;
  const isSelected      = ['SELECTED', 'PASSED'].includes(profile?.interview_status);
  const isKycApproved   = profile?.is_verified && !isSelected && !isFullAccess;
  const isAwaitingCareId = isSelected && !isFullAccess;

  const title = isFullAccess ? 'My Workspace' : 'My Dashboard';

  return (
    <AppLayout title={title}>
      {isFullAccess      ? <Stage3View  profile={profile} shiftData={shiftData} /> :
       isAwaitingCareId  ? <Stage2View  profile={profile} /> :
       isKycApproved     ? <Stage1bView profile={profile} /> :
                           <Stage1View  profile={profile} docs={docs} />}
    </AppLayout>
  );
}
