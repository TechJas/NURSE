import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import {
  listNurses, getInterviewSessions, listHospitalAdmins,
} from '../api/endpoints';
import toast from 'react-hot-toast';

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

  return (
    <AppLayout title="Platform Admin Dashboard">
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Stats Row ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:16, marginBottom:28 }}>
            {[
              { label:'Total Nurses',       value:total,           icon:'👩‍⚕️', color:'#EBF5FB', route:'/admin/nurses' },
              { label:'KYC Pending',        value:kycPending,      icon:'⏳',   color:'#FEF9E7', route:'/admin/nurses' },
              { label:'KYC Approved',       value:kycApproved,     icon:'✅',   color:'#EAFAF1', route:'/admin/nurses' },
              { label:'Interview Sessions', value:sessions.length, icon:'🗓️', color:'#F3E8FF', route:'/admin/interviews' },
              { label:'Awaiting Result',    value:scheduled,       icon:'📋',   color:'#FFF7ED', route:'/admin/interviews' },
              { label:'Active Nurses',      value:active,          icon:'⚡',   color:'#ECFDF5', route:'/admin/nurses' },
            ].map(s => (
              <div key={s.label} onClick={() => navigate(s.route)}
                style={{ background:'#fff', borderRadius:12, padding:'20px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', cursor:'pointer', display:'flex', alignItems:'center', gap:14, border:'1px solid #f0f0f0', transition:'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'}>
                <div style={{ width:44, height:44, borderRadius:10, background:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:26, fontWeight:700, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── KYC + Interview Row ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
            <div className="card">
              <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h2>⏳ KYC Pending ({kycPending})</h2>
                <button className="btn btn-outline" style={{ fontSize:12, padding:'4px 12px' }} onClick={() => navigate('/admin/nurses')}>View All →</button>
              </div>
              <div className="card-body" style={{ padding: recentPending.length === 0 ? 24 : 0 }}>
                {recentPending.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>🎉 No pending KYC reviews!</p>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>{['Name','Specialization','Action'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {recentPending.map(n => (
                        <tr key={n.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={td}><strong style={{ fontSize:13 }}>{n.full_name}</strong><div style={{ fontSize:11, color:'var(--text-muted)' }}>{n.email}</div></td>
                          <td style={td}><span style={{ fontSize:12 }}>{n.specialization || '—'}</span></td>
                          <td style={td}><button className="btn btn-primary" style={{ padding:'4px 10px', fontSize:11, background:'#f59e0b', borderColor:'#f59e0b' }} onClick={() => navigate('/admin/nurses')}>📋 Review</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h2>📝 Awaiting Result ({scheduled})</h2>
                <button className="btn btn-outline" style={{ fontSize:12, padding:'4px 12px' }} onClick={() => navigate('/admin/interviews')}>View All →</button>
              </div>
              <div className="card-body" style={{ padding: recentScheduled.length === 0 ? 24 : 0 }}>
                {recentScheduled.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No nurses currently scheduled.</p>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>{['Name','Email','Action'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {recentScheduled.map(n => (
                        <tr key={n.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={td}><strong style={{ fontSize:13 }}>{n.full_name}</strong></td>
                          <td style={{ ...td, fontSize:12, color:'var(--text-muted)' }}>{n.email}</td>
                          <td style={td}><button className="btn btn-primary" style={{ padding:'4px 10px', fontSize:11 }} onClick={() => navigate('/admin/interviews')}>📊 Results</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ── Hospital Admin Summary Card ── */}
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2>🏥 Hospital Admins</h2>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:'2px 0 0' }}>
                  {haCounts.active} active · {haCounts.pending} pending · {haCounts.archived} archived
                </p>
              </div>
              <button className="btn btn-primary" style={{ background:'#7c3aed' }}
                onClick={() => navigate('/admin/hospital-admins')}>
                Manage →
              </button>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="card">
            <div className="card-header"><h2>⚡ Quick Actions</h2></div>
            <div className="card-body" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/admin/nurses')}>👩‍⚕️ Manage Nurse Registry</button>
              <button className="btn btn-primary" style={{ background:'#7c3aed' }} onClick={() => navigate('/admin/interviews')}>🗓️ Manage Interviews</button>
              <button className="btn btn-primary" style={{ background:'#0369a1' }} onClick={() => navigate('/admin/system-id')}>🆔 System ID Generation</button>
              <button className="btn btn-primary" style={{ background:'#0d9488' }} onClick={() => navigate('/admin/hospital-admins')}>🏥 Hospital Admins</button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' };
const td = { padding:'12px 14px', verticalAlign:'middle' };
