import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { getNurseProfile, getShiftInfo, getMyDocuments } from '../api/endpoints';
import toast from 'react-hot-toast';
import {
  DocumentsIcon, KeyIcon, CalendarIcon, NurseIcon, InterviewIcon,
  TaskIcon, IDIcon, CheckIcon, PulseIcon,
} from '../components/BrandIcons';

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
    return { bg: 'rgba(18,151,169,0.1)', border: 'rgba(18,151,169,0.4)', label: '#0B5E6B', badge: 'Morning' };
  if (t.includes('evening') || t.startsWith('2') || t.startsWith('14'))
    return { bg: 'rgba(201,162,75,0.14)', border: 'rgba(201,162,75,0.45)', label: '#9C7B2E', badge: 'Evening' };
  if (t.includes('night') || t.startsWith('10') || t.startsWith('22'))
    return { bg: 'rgba(20,43,61,0.08)', border: 'rgba(20,43,61,0.35)', label: '#142B3D', badge: 'Night' };
  if (t.includes('emergency'))
    return { bg: 'rgba(214,69,69,0.1)', border: 'rgba(214,69,69,0.4)', label: '#b32727', badge: 'Emergency' };
  return { bg: 'rgba(11,94,107,0.08)', border: 'rgba(11,94,107,0.35)', label: '#0B5E6B', badge: 'Shift' };
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
          background: 'linear-gradient(135deg, #0B5E6B 0%, #1297A9 70%, #0d4a56 140%)',
          padding: 22, boxShadow: '0 10px 32px rgba(11,94,107,0.32)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -24, top: -24, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', right: 70, bottom: -46, width: 120, height: 120, borderRadius: '50%', background: 'rgba(201,162,75,0.14)' }} />
          <div style={{ zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              <img src={`${import.meta.env.BASE_URL}carenium-logo.jpg`} alt="" style={{ width: 20, height: 20, borderRadius: 6, background: '#fff', padding: 2, objectFit: 'contain' }} />
              Carenium Health
            </div>
            <div style={{ color: '#fff', fontSize: 19, fontWeight: 800, lineHeight: 1.2 }}>{card.nurse_name}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 }}>{card.assigned_position}</div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 7, padding: '7px 12px', fontFamily: "'Courier New', monospace", letterSpacing: 3, color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'inline-block' }}>
              {card.unique_id}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Valid: {card.valid_from} — {card.valid_upto}</span>
              <span style={{ color: 'rgba(201,162,75,0.9)', fontSize: 10, fontWeight: 600 }}>Tap to flip</span>
            </div>
          </div>
        </div>
        {/* BACK */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(135deg, #142B3D 0%, #0B5E6B 90%)',
          padding: 22, boxShadow: '0 10px 32px rgba(20,43,61,0.32)',
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
            <span style={{ color: 'rgba(201,162,75,0.85)', fontSize: 10, fontWeight: 600 }}>Tap to flip</span>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <IDIcon size={13} /> Tap the card to see front / back
      </p>
    </div>
  );
}

function OnboardingTimeline({ idx, allDone = false }) {
  return (
    <div className="status-steps">
      {STEPS.map((step, i) => (
        <div style={{ display: 'contents' }} key={step}>
          {i > 0 && <div className={`step-line ${allDone || i < idx ? 'done' : ''}`} />}
          <div className={`step ${allDone ? 'done' : i < idx ? 'done' : i + 1 === idx ? 'active' : ''}`}>
            <div className="step-dot">{allDone || i < idx ? <CheckIcon size={12} /> : i + 1}</div>
            <span className="step-label">{step}</span>
          </div>
        </div>
      ))}
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
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Welcome back</div>
          <div className="hero-title">{profile?.full_name || profile?.email}</div>
          <div className="hero-sub">Account status: KYC onboarding in progress</div>
          <span className="hero-status"><PulseIcon size={13} /> KYC Pending</span>
        </div>
        <div className="hero-icon"><DocumentsIcon size={44} /></div>
      </div>

      {/* Onboarding Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Onboarding Progress</h2></div>
        <div className="card-body">
          <OnboardingTimeline idx={idx} />
        </div>
      </div>

      {/* Document Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Document Upload Status</h2></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: allUploaded ? 'var(--brand-teal)' : 'var(--brand-gold-deep)' }}>
                {uploadedDocs} / {totalDocs}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Documents uploaded</div>
            </div>
            <div style={{
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: allUploaded ? 'rgba(11,94,107,0.08)' : 'rgba(201,162,75,0.14)',
              color: allUploaded ? '#0B5E6B' : '#9C7B2E',
              border: `1px solid ${allUploaded ? 'rgba(11,94,107,0.35)' : 'rgba(201,162,75,0.45)'}`,
            }}>
              {allUploaded ? 'All documents submitted' : 'Incomplete — please upload all documents'}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 14, height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(uploadedDocs / totalDocs) * 100}%`, background: allUploaded ? 'linear-gradient(90deg,var(--brand-teal),var(--brand-cyan))' : 'linear-gradient(90deg,var(--brand-gold),var(--brand-gold-deep))', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h2>Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/documents" className="btn btn-primary"><DocumentsIcon size={16} /> Upload Documents</Link>
          <Link to="/working-shift" className="btn btn-outline"><KeyIcon size={16} /> Working Shift</Link>
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
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Welcome, {profile?.full_name || profile?.email}</div>
          <div className="hero-title">KYC Approved</div>
          <div className="hero-sub">Your identity documents have been verified. Awaiting interview scheduling.</div>
          <span className="hero-status"><CheckIcon size={13} /> Verified</span>
        </div>
        <div className="hero-icon"><NurseIcon size={44} /></div>
      </div>

      {/* Onboarding Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Onboarding Progress</h2></div>
        <div className="card-body">
          <OnboardingTimeline idx={idx} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h2>Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/working-shift" className="btn btn-outline"><KeyIcon size={16} /> Working Shift</Link>
        </div>
      </div>
    </>
  );
}

// ── Stage 2 — Awaiting CARE ID ──────────────────────────────────────────────
function Stage2View({ profile }) {
  const iStatus   = profile?.interview_status || 'PENDING';
  const isPassed  = ['PASSED', 'SELECTED'].includes(iStatus);

  return (
    <>
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Welcome, {profile?.full_name || profile?.email}</div>
          <div className="hero-title">KYC Approved</div>
          <div className="hero-sub">Your identity documents have been verified.</div>
          <span className="hero-status"><CheckIcon size={13} /> Verified</span>
        </div>
        <div className="hero-icon"><InterviewIcon size={44} /></div>
      </div>

      {/* Interview Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Interview Status</h2></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              background: isPassed ? 'rgba(11,94,107,0.08)' : 'rgba(201,162,75,0.14)',
              color:      isPassed ? '#0B5E6B' : '#9C7B2E',
              border: `1px solid ${isPassed ? 'rgba(11,94,107,0.35)' : 'rgba(201,162,75,0.45)'}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {isPassed ? <CheckIcon size={15} /> : <PulseIcon size={15} />}
              {isPassed ? 'Interview Passed / Selected' : `Status: ${iStatus}`}
            </div>
            {isPassed && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Check your notifications for your CARE ID status.</span>}
          </div>
        </div>
      </div>

      {/* Onboarding recap */}
      <div className="card">
        <div className="card-header"><h2>Your Journey</h2></div>
        <div className="card-body">
          <OnboardingTimeline idx={4} allDone />
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
  const _d=new Date(); const today        = _d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0');
  const todayShift   = shifts.find(s => s.shift_date === today);
  const upcoming     = shifts.filter(s => s.shift_date >= today).slice(0, 3);

  return (
    <>
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Welcome back</div>
          <div className="hero-title">{profile?.full_name || profile?.email}</div>
          <div className="hero-sub">{profile?.specialization || 'Carenium Staff Nurse'}</div>
          <span className="hero-status"><CheckIcon size={13} /> Full Access Active</span>
        </div>
        <div className="hero-icon"><NurseIcon size={44} /></div>
      </div>

      {/* Collapsible KYC tracker */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setKycExpanded(e => !e)}
          style={{
            background: 'rgba(11,94,107,0.07)', border: '1px solid rgba(11,94,107,0.3)',
            borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600,
            color: '#0B5E6B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <CheckIcon size={14} /> Onboarding Complete — all 4 stages passed {kycExpanded ? '▲' : '▼'}
        </button>
        {kycExpanded && (
          <div className="card" style={{ marginTop: 10 }}>
            <div className="card-body">
              <OnboardingTimeline idx={4} allDone />
            </div>
          </div>
        )}
      </div>

      {/* 3 Stat Cards */}
      <div className="stats-grid cols-3">
        {[
          { icon: 'calendar', label: "Today's Shift", value: todayShift ? todayShift.shift_time : 'None Assigned', sub: todayShift ? todayShift.location : 'Check back later' },
          { icon: 'task', label: 'Total Duties',  value: shifts.length, sub: 'Assigned shifts' },
          { icon: 'pulse', label: 'Upcoming',       value: upcoming.length, sub: 'In your schedule' },
        ].map(s => {
          const Icon = s.icon === 'calendar' ? CalendarIcon : s.icon === 'task' ? TaskIcon : PulseIcon;
          return (
            <div key={s.label} className="stat-card">
              <div className="stat-info">
                <h3>{s.value}</h3>
                <p>{s.label}</p>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <div className="stat-icon gold"><Icon size={22} /></div>
            </div>
          );
        })}
      </div>

      {/* ID Card + Upcoming Shifts */}
      <div className="two-col-grid" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="card-header"><h2>Your Nurse ID</h2></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {card ? <NurseIDCard card={card} nurse={profile} /> : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>ID card not available yet.</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Upcoming Shifts</h2>
            <Link to="/duty" style={{ fontSize: 12, color: 'var(--brand-cyan)', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {upcoming.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--brand-cyan)' }}><CalendarIcon size={30} /></div>
                No upcoming shifts yet.<br />Admin will assign duties soon.
              </div>
            ) : upcoming.slice(0, 3).map((s, i) => {
              const col = shiftColor(s.shift_time);
              const isToday = s.shift_date === today;
              const PBADGE = { emergency: { bg: 'rgba(214,69,69,0.1)', color: '#b32727', icon: '●' }, urgent: { bg: 'rgba(201,162,75,0.14)', color: '#9C7B2E', icon: '●' }, routine: { bg: 'rgba(11,94,107,0.08)', color: '#0B5E6B', icon: '●' } };
              const pb = PBADGE[s.priority] || PBADGE.routine;
              return (
                <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < Math.min(upcoming.length, 3) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.label, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                        {new Date(s.shift_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {isToday && <span style={{ marginLeft: 6, fontSize: 9, background: 'linear-gradient(90deg,var(--brand-gold),var(--brand-gold-deep))', color: 'var(--brand-navy)', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>TODAY</span>}
                      </span>
                      <span style={{ fontSize: 10, background: col.bg, color: col.label, border: `1px solid ${col.border}`, borderRadius: 5, padding: '1px 6px', fontWeight: 600 }}>{col.badge}</span>
                    </div>
                    {s.task_title && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.task_title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: pb.bg, color: pb.color, borderRadius: 5, padding: '1px 6px' }}>{pb.icon} {s.priority}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><CalendarIcon size={11} /> {s.shift_time} · <span style={{ display: 'inline-block', verticalAlign: '-1px' }}><IDIcon size={11} /></span> {s.ward || s.location}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h2>Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link to="/duty"      className="btn btn-primary"><TaskIcon size={16} /> View All Duties</Link>
          <Link to="/documents" className="btn btn-outline"><DocumentsIcon size={16} /> My Documents</Link>
          <Link to="/requests"  className="btn btn-outline"><TaskIcon size={16} /> Create Delivery Request</Link>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery requests are managed by your hospital admin</span>
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

    Promise.all([profileReq, docsReq]).finally(() => setLoading(false));
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
        <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(11,94,107,0.25)', borderTopColor: 'var(--brand-teal)' }} /> Loading…</div>
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
