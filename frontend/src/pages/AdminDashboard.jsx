import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import {
  listNurses, getInterviewSessions, listHospitalAdmins,
} from '../api/endpoints';
import toast from 'react-hot-toast';
import { DashboardIcon, NurseIcon, IDIcon, InterviewIcon, TaskIcon, HospitalIcon, ClockIcon, CheckIcon, KeyIcon, PinIcon } from '../components/BrandIcons';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [nurses,   setNurses]   = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [haCounts, setHaCounts] = useState({ active:0, pending:0, archived:0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [nRes, sRes, haRes] = await Promise.all([
          listNurses(), getInterviewSessions(), listHospitalAdmins(),
        ]);
        setNurses(nRes.data);
        setSessions(sRes.data);
        const all = Array.isArray(haRes.data) ? haRes.data : [];
        setHaCounts({
          active:   all.filter(a => a.admin_role === 'hospital_admin' && a.status === 'active').length,
          pending:  all.filter(a => a.admin_role === 'hospital_admin' && a.status === 'pending').length,
          archived: all.filter(a => a.admin_role === 'hospital_admin' && a.status === 'deactivated').length,
        });
      } catch { toast.error('Failed to load dashboard data.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const total       = nurses.length;
  const kycPending  = nurses.filter(n => !n.is_verified).length;
  const kycApproved = nurses.filter(n => n.is_verified).length;
  const scheduled   = nurses.filter(n => n.interview_status === 'SCHEDULED').length;
  const active      = nurses.filter(n => n.shift_unlocked).length;

  const recentPending   = nurses.filter(n => !n.is_verified).slice(0, 5);
  const recentScheduled = nurses.filter(n => n.interview_status === 'SCHEDULED').slice(0, 5);

  const cards = [
    { icon: 'nurse',   label: 'Total Nurses',       value: total,       route: '/admin/nurses',      gold: false },
    { icon: 'clock',   label: 'KYC Pending',        value: kycPending,  route: '/admin/nurses',      gold: true },
    { icon: 'check',   label: 'KYC Approved',       value: kycApproved, route: '/admin/nurses',      gold: false },
    { icon: 'id',      label: 'Interview Sessions', value: sessions.length, route: '/admin/interviews', gold: false },
    { icon: 'task',    label: 'Awaiting Result',    value: scheduled,   route: '/admin/interviews',  gold: true },
    { icon: 'nurse',   label: 'Active Nurses',      value: active,      route: '/admin/nurses',      gold: false },
  ];

  return (
    <AppLayout title="Platform Admin Dashboard">
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* ── 6 Stat Cards ── */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {cards.map(s => {
              const Icon = s.icon === 'nurse' ? NurseIcon : s.icon === 'clock' ? ClockIcon : s.icon === 'check' ? CheckIcon : s.icon === 'id' ? IDIcon : TaskIcon;
              return (
                <div key={s.label} className="stat-card" onClick={() => navigate(s.route)} style={{ cursor: 'pointer' }}>
                  <div className="stat-info">
                    <h3>{s.value}</h3>
                    <p>{s.label}</p>
                    <div className="stat-sub">{s.gold ? 'Needs attention' : 'View details'}</div>
                  </div>
                  <div className={`stat-icon${s.gold ? ' gold' : ''}`}><Icon size={22} /></div>
                </div>
              );
            })}
          </div>

          {/* ── KYC + Interview Row ── */}
          <div className="two-col-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ClockIcon size={18} /> KYC Pending ({kycPending})</h2>
                <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => navigate('/admin/nurses')}>View All</button>
              </div>
              <div className="card-body" style={{ padding: recentPending.length === 0 ? 24 : 0 }}>
                {recentPending.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <CheckIcon size={16} style={{ color: '#1E8449' }} /> No pending KYC reviews!
                  </p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Name</th><th>Specialization</th><th>Action</th></tr></thead>
                      <tbody>
                        {recentPending.map(n => (
                          <tr key={n.id}>
                            <td><strong style={{ fontSize: 13 }}>{n.full_name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.email}</div></td>
                            <td><span style={{ fontSize: 12 }}>{n.specialization || '—'}</span></td>
                            <td>
                              <button className="btn btn-primary" style={{ padding:'5px 12px', fontSize:11 }}
                                onClick={() => navigate('/admin/nurses')}>Review</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TaskIcon size={18} /> Awaiting Result ({scheduled})</h2>
                <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => navigate('/admin/interviews')}>View All</button>
              </div>
              <div className="card-body" style={{ padding: recentScheduled.length === 0 ? 24 : 0 }}>
                {recentScheduled.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No nurses currently scheduled.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                      <tbody>
                        {recentScheduled.map(n => (
                          <tr key={n.id}>
                            <td><strong style={{ fontSize: 13 }}>{n.full_name}</strong></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.email}</td>
                            <td>
                              <button className="btn btn-primary" style={{ padding:'5px 12px', fontSize:11 }}
                                onClick={() => navigate('/admin/interviews')}>Results</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Hospital Admin Summary ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="stat-icon" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(11,94,107,0.08)', color: '#0B5E6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HospitalIcon size={22} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700 }}>Hospital Admins</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {haCounts.active} active · {haCounts.pending} pending · {haCounts.archived} archived
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/admin/hospital-admins')}>Manage</button>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="card">
            <div className="card-header"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><DashboardIcon size={18} /> Quick Actions</h2></div>
            <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Manage Nurse Registry', route: '/admin/nurses',            icon: <NurseIcon size={15} /> },
                { label: 'Manage Interviews',     route: '/admin/interviews',        icon: <InterviewIcon size={15} /> },
                { label: 'System ID Generation',  route: '/admin/system-id',         icon: <KeyIcon size={15} /> },
                { label: 'Hospital Admins',       route: '/admin/hospital-admins',   icon: <PinIcon size={15} /> },
              ].map(a => (
                <button key={a.label} className="btn btn-primary" onClick={() => navigate(a.route)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
