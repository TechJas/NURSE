import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  getHospitalAdminStats, getHospitalNurses,
  getHospitalTasks, createDeptHead, listDeptHeads,
} from '../api/endpoints';
import toast from 'react-hot-toast';

const SPECS   = ['All','Emergency','Pediatrics','ICU','General','Home Care'];
const TYPES   = ['Patient Care','Emergency Response','Medication Administration','Patient Monitoring','Ward Rounds','Triage'];
const PRIOS   = [{v:'emergency',l:'🔴 Emergency'},{v:'urgent',l:'🟡 Urgent'},{v:'routine',l:'🟢 Routine'}];
const PBADGE  = { emergency:{bg:'#fef2f2',c:'#b91c1c',i:'🔴'}, urgent:{bg:'#fffbeb',c:'#92400e',i:'🟡'}, routine:{bg:'#f0fdf4',c:'#166534',i:'🟢'} };
const SBADGE  = { assigned:{bg:'#eff6ff',c:'#1d4ed8',l:'📋 Assigned'}, acknowledged:{bg:'#f0fdf4',c:'#166534',l:'✅ Acknowledged'}, completed:{bg:'#f8fafc',c:'#475569',l:'☑️ Completed'} };
const DEPT_ICONS = { Emergency:'🚨', Pediatrics:'👶', ICU:'🏥', General:'🩺', 'Home Care':'🏠' };
const today = new Date().toISOString().split('T')[0];

// AssignPanel removed — task assignment is exclusively handled by Department Heads

// ─── Create Dept Head Modal ───────────────────────────────────────────────────
function DeptHeadModal({ onClose, onDone, onCreated }) {
  const [f, setF] = useState({ full_name:'', email:'', department: SPECS[1] });
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = async () => {
    if (!f.full_name||!f.email) return toast.error('Full name and email are required');
    setBusy(true);
    try {
      const res = await createDeptHead(f);
      toast.success(`Dept Head account created for ${f.full_name}!`);
      onCreated(res.data);
      onDone();
    } catch(e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff',borderRadius:16,padding:28,width:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:16,fontWeight:700,margin:0 }}>👤 Create Dept Head</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer' }}>✕</button>
        </div>
        {[['full_name','Full Name','Dr. Jane Smith'],['email','Email','jane@hospital.com']].map(([k,label,ph])=>(
          <div key={k} style={{ marginBottom:14 }}>
            <label style={lbl}>{label} *</label>
            <input style={inp} placeholder={ph} type='text' value={f[k]} onChange={e=>set(k,e.target.value)} />
          </div>
        ))}
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Department *</label>
          <select style={inp} value={f.department} onChange={e=>set('department',e.target.value)}>
            {SPECS.filter(s=>s!=='All').map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button className="btn btn-outline" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2, background:'#7c3aed' }} onClick={submit} disabled={busy}>{busy?'Creating…':'🚀 Create Account'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function HospitalAdminDashboard({ defaultTab }) {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [nurses,   setNurses]   = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [deptHeads,setDeptHeads]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [specFilter,setSpecFilter] = useState('All');
  const [search,   setSearch]   = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [createdDeptHead, setCreatedDeptHead] = useState(null);
  const [tab,      setTab]      = useState(defaultTab || 'nurses'); // 'nurses' | 'tasks' | 'dept-heads'

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, nRes, tRes, dRes] = await Promise.all([
        getHospitalAdminStats(), getHospitalNurses(), getHospitalTasks(), listDeptHeads(),
      ]);
      setStats(sRes.data);
      setNurses(Array.isArray(nRes.data) ? nRes.data : []);
      setTasks(Array.isArray(tRes.data) ? tRes.data : []);
      setDeptHeads(Array.isArray(dRes.data) ? dRes.data : []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    setTab(defaultTab || 'nurses');
  }, [defaultTab]);

  const filteredNurses = nurses.filter(n => {
    const sm = specFilter === 'All' || n.specialization?.toLowerCase().includes(specFilter.toLowerCase());
    const nm = !search || n.full_name.toLowerCase().includes(search.toLowerCase());
    return sm && nm;
  });

  const depts = stats?.departments || [];

  return (
    <AppLayout title={`🏥 ${user?.hospital_name || 'Hospital'} — Admin Dashboard`}>
      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Welcome Banner ── */}
          <div style={{ background:'linear-gradient(135deg,#0f2f6e,#1a6fa8)',borderRadius:16,padding:'24px 28px',marginBottom:24,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13,opacity:.7,letterSpacing:1,textTransform:'uppercase',marginBottom:4 }}>Hospital Admin Portal</div>
              <div style={{ fontSize:22,fontWeight:800 }}>{user?.hospital_name || 'Your Hospital'}</div>
              <div style={{ fontSize:13,opacity:.8,marginTop:4 }}>Welcome back, {user?.full_name || user?.email}</div>
            </div>
            <div style={{ fontSize:48,opacity:.3 }}>🏥</div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24 }}>
            {[
              { label:'Active Nurses', value: stats?.active_nurses ?? 0, icon:'👩‍⚕️', bg:'#EBF5FB', border:'#93c5fd' },
              { label:'Total Tasks',   value: stats?.total_tasks   ?? 0, icon:'📋',  bg:'#F0FDF4', border:'#86efac' },
              { label:'Tasks Today',   value: stats?.tasks_today   ?? 0, icon:'📅',  bg:'#FEF9E7', border:'#fcd34d' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,border:`1px solid ${s.border}`,borderRadius:14,padding:'18px 20px',display:'flex',alignItems:'center',gap:14 }}>
                <span style={{ fontSize:28 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:26,fontWeight:800 }}>{s.value}</div>
                  <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Department Performance ── */}
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header"><h2>📊 Department Performance</h2></div>
            <div className="card-body" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14 }}>
              {depts.map(d=>(
                <div key={d.department} style={{ background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px 14px',textAlign:'center' }}>
                  <div style={{ fontSize:28,marginBottom:6 }}>{DEPT_ICONS[d.department]||'🏥'}</div>
                  <div style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>{d.department}</div>
                  <div style={{ display:'flex',justifyContent:'space-around',fontSize:12 }}>
                    <div><div style={{ fontWeight:700,color:'#1d4ed8' }}>{d.nurse_count}</div><div style={{ color:'var(--text-muted)' }}>Nurses</div></div>
                    <div><div style={{ fontWeight:700,color:'#166534' }}>{d.total_tasks}</div><div style={{ color:'var(--text-muted)' }}>Tasks</div></div>
                    <div><div style={{ fontWeight:700,color:'#92400e' }}>{d.pending_tasks}</div><div style={{ color:'var(--text-muted)' }}>Pending</div></div>
                  </div>
              </div>
            ))}
            </div>
          </div>

          {/* ── Tabbed Section ── */}
          <div className="card">
            <div className="card-header" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
              <div style={{ display:'flex',gap:8 }}>
                {[['nurses','👩‍⚕️ Nurses'],['tasks','📋 Task History'],['dept-heads','👤 Dept Heads']].map(([t,l])=>(
                  <button key={t} onClick={()=>setTab(t)}
                    style={{ padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                      background: tab===t ? 'var(--primary)' : '#f3f4f6',
                      color: tab===t ? '#fff' : 'var(--text)' }}>
                    {l}
                  </button>
                ))}
              </div>
              {tab==='dept-heads' && (
                <button className="btn btn-primary" style={{ fontSize:12,padding:'6px 14px',background:'#7c3aed' }}
                  onClick={()=>setShowDeptModal(true)}>
                  ➕ Create Dept Head
                </button>
              )}
            </div>

            {/* NURSES TAB */}
            {tab==='nurses' && (
              <div className="card-body">
                <div style={{ display:'flex',gap:12,marginBottom:16,flexWrap:'wrap' }}>
                  <input style={{ ...inp,maxWidth:220,margin:0 }} placeholder="🔍 Search nurse…" value={search} onChange={e=>setSearch(e.target.value)} />
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {SPECS.map(s=>(
                      <button key={s} onClick={()=>setSpecFilter(s)}
                        style={{ padding:'5px 12px',borderRadius:20,border:`1px solid ${specFilter===s?'var(--primary)':'#e5e7eb'}`,
                          background:specFilter===s?'var(--primary)':'#fff',
                          color:specFilter===s?'#fff':'var(--text)',
                          fontSize:12,cursor:'pointer',fontWeight:specFilter===s?700:400 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredNurses.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'28px 0',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ fontSize:28,marginBottom:8 }}>👩‍⚕️</div>No nurses match your filter.
                  </div>
                ) : (
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>
                      {['Nurse','Specialization','Email'].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredNurses.map(n=>(
                        <tr key={n.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={td}><strong style={{ fontSize:13 }}>{n.full_name}</strong></td>
                          <td style={td}><span style={{ background:'#eff6ff',color:'#1d4ed8',border:'1px solid #93c5fd',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{n.specialization}</span></td>
                          <td style={{ ...td,fontSize:12,color:'var(--text-muted)' }}>{n.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {tab==='tasks' && (
              <div className="card-body" style={{ padding:0 }}>
                {tasks.length === 0 ? (
                  <div style={{ textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:13 }}>No tasks assigned yet.</div>
                ) : (
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>
                      {['Nurse','Task','Priority','Ward','Date','Status'].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {tasks.map(t=>{
                        const pb=PBADGE[t.priority]||PBADGE.routine;
                        const sb=SBADGE[t.status]||SBADGE.assigned;
                        return (
                          <tr key={t.id} style={{ borderBottom:'1px solid var(--border)' }}>
                            <td style={td}><strong style={{ fontSize:13 }}>{t.nurse_name}</strong><div style={{ fontSize:11,color:'var(--text-muted)' }}>{t.specialization}</div></td>
                            <td style={td}><div style={{ fontSize:13,fontWeight:600 }}>{t.task_title}</div><div style={{ fontSize:11,color:'var(--text-muted)' }}>{t.task_type}</div></td>
                            <td style={td}><span style={{ background:pb.bg,color:pb.c,border:`1px solid ${pb.bg}`,borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700 }}>{pb.i} {t.priority}</span></td>
                            <td style={{ ...td,fontSize:12 }}>{t.ward}</td>
                            <td style={{ ...td,fontSize:12 }}>{t.shift_date}<div style={{ color:'var(--text-muted)' }}>{t.shift_time}</div></td>
                            <td style={td}><span style={{ background:sb.bg,color:sb.c,borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{sb.l}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* DEPT HEADS TAB */}
            {tab==='dept-heads' && (
              <div className="card-body" style={{ padding:0 }}>
                {deptHeads.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'32px 20px',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>👤</div>
                    No dept heads created yet.<br />
                    <button className="btn btn-primary" style={{ marginTop:12,background:'#7c3aed' }} onClick={()=>setShowDeptModal(true)}>➕ Create First Dept Head</button>
                  </div>
                ) : (
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>
                      {['Name','Email','Department'].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {deptHeads.map(d=>(
                        <tr key={d.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={td}><strong style={{ fontSize:13 }}>{d.full_name}</strong></td>
                          <td style={{ ...td,fontSize:12,color:'var(--text-muted)' }}>{d.email}</td>
                          <td style={td}><span style={{ background:'#f3e8ff',color:'#7c3aed',border:'1px solid #c4b5fd',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{DEPT_ICONS[d.department]||'🏥'} {d.department}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>

          {/* Overlays */}
          {showDeptModal && <DeptHeadModal onClose={()=>setShowDeptModal(false)} onDone={()=>{setShowDeptModal(false);loadAll();setTab('dept-heads');}} onCreated={(d)=>setCreatedDeptHead(d)} />}

          {/* ── Password Reveal Modal ── */}
          {createdDeptHead && (
            <div style={{ position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center' }}
              onClick={() => setCreatedDeptHead(null)}>
              <div style={{ background:'#fff',borderRadius:16,padding:32,width:460,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
                <h2 style={{ fontSize:18,fontWeight:700,margin:'0 0 4px' }}>Dept Head Created!</h2>
                <p style={{ fontSize:13,color:'#6b7280',margin:'0 0 20px' }}>Account is active. Share credentials with the user.</p>
                <div style={{ background:'#f9fafb',borderRadius:12,padding:20,marginBottom:20,textAlign:'left' }}>
                  <div style={{ fontSize:13,color:'#6b7280',marginBottom:8 }}>👤 <strong>{createdDeptHead.full_name}</strong></div>
                  <div style={{ fontSize:13,color:'#6b7280',marginBottom:16 }}>📧 {createdDeptHead.email}  |  🏥 {createdDeptHead.department}</div>
                  <div style={{ fontSize:12,color:'#92400e',background:'#fef3c7',padding:'8px 12px',borderRadius:8,marginBottom:12 }}>
                    🔑 Temporary Password
                  </div>
                  <input id="dh-temp-pw" readOnly value={createdDeptHead.temp_password}
                    style={{ background:'#fff',border:'2px dashed #d1d5db',borderRadius:8,padding:'12px 16px',fontFamily:'monospace',fontSize:18,fontWeight:700,letterSpacing:1,color:'#1f2937',marginBottom:12,width:'100%',textAlign:'center',outline:'none',boxSizing:'border-box',cursor:'text' }} />
                  <button
                    onClick={() => { try { navigator.clipboard.writeText(createdDeptHead.temp_password); toast.success('Password copied!'); } catch { const el = document.getElementById('dh-temp-pw'); if (el) { el.select(); document.execCommand('copy'); toast.success('Password copied!'); } } }}
                    style={{ padding:'8px 20px',borderRadius:8,border:'1px solid #d1d5db',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,width:'100%' }}>
                    📋 Copy Password
                  </button>
                </div>
                <button onClick={() => setCreatedDeptHead(null)} className="btn btn-primary" style={{ background:'#7c3aed',width:'100%' }}>
                  I've Saved the Password — Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </AppLayout>
  );
}

const lbl = { display:'block',fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:5 };
const inp = { width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:13,outline:'none',boxSizing:'border-box' };
const th  = { padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.04em' };
const td  = { padding:'10px 12px',verticalAlign:'middle' };
