import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  getHospitalAdminStats, getHospitalNurses,
  getHospitalTasks, createDeptHead, listDeptHeads,
} from '../api/endpoints';
import toast from 'react-hot-toast';
import { HospitalIcon, NurseIcon, TaskIcon, CalendarIcon, PlusIcon, XIcon, CopyIcon, KeyIcon, SearchIcon, UserIcon, CheckIcon, ClockIcon, BanIcon } from '../components/BrandIcons';

const SPECS   = ['All','Emergency','Pediatrics','ICU','General','Home Care'];
const TYPES   = ['Patient Care','Emergency Response','Medication Administration','Patient Monitoring','Ward Rounds','Triage'];
const PRIOS   = [{v:'emergency',l:'Emergency'},{v:'urgent',l:'Urgent'},{v:'routine',l:'Routine'}];
const PBADGE  = { emergency:{bg:'#fdedec',c:'#b32727'}, urgent:{bg:'rgba(201,162,75,0.14)',c:'#9C7B2E'}, routine:{bg:'#eafaf1',c:'#166534'} };
const SBADGE  = { assigned:{bg:'#ebf5fb',c:'#1a5276',l:'Assigned'}, acknowledged:{bg:'#eafaf1',c:'#166534',l:'Acknowledged'}, completed:{bg:'#f0f3f4',c:'#566573',l:'Completed'} };

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
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(20,43,61,0.55)',display:'flex',justifyContent:'center',alignItems:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff',borderRadius:16,padding:28,width:460,boxShadow:'0 20px 60px rgba(9,25,38,0.25)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:700,margin:0,fontFamily:'var(--font-display)',color:'var(--brand-navy)',display:'flex',alignItems:'center',gap:10 }}>
            <UserIcon size={18} /> Create Dept Head
          </h2>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:6,display:'flex' }}><XIcon size={18} /></button>
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
          <button className="btn btn-primary" style={{ flex:2, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }} onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : <><PlusIcon size={15} /> Create Account</>}
          </button>
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
    <AppLayout title={`${user?.hospital_name || 'Hospital'} — Admin Dashboard`}>
      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Welcome Banner ── */}
          <div className="hero-card" style={{ background: 'radial-gradient(480px 240px at 92% -30%, rgba(201,162,75,0.25), transparent 60%), radial-gradient(360px 200px at -10% 120%, rgba(18,151,169,0.35), transparent 60%), linear-gradient(120deg, var(--brand-teal) 0%, #0d4a56 55%, var(--brand-navy) 100%)' }}>
            <div>
              <div className="hero-kicker">Hospital Admin Portal</div>
              <div className="hero-title">{user?.hospital_name || 'Your Hospital'}</div>
              <p className="hero-sub">Welcome back, {user?.full_name || user?.email}</p>
              <span className="hero-status"><HospitalIcon size={13} /> Hospital Admin</span>
            </div>
            <div className="hero-icon"><HospitalIcon size={44} /></div>
          </div>

          {/* ── Stats Row ── */}
          <div className="stats-grid cols-3">
            {[
              { label:'Active Nurses', value: stats?.active_nurses ?? 0, icon: <NurseIcon size={22} />, gold: false },
              { label:'Total Tasks',   value: stats?.total_tasks   ?? 0, icon: <TaskIcon size={22} />,  gold: false },
              { label:'Tasks Today',   value: stats?.tasks_today   ?? 0, icon: <CalendarIcon size={22} />, gold: true },
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div className="stat-info">
                  <h3>{s.value}</h3>
                  <p>{s.label}</p>
                </div>
                <div className={`stat-icon${s.gold ? ' gold' : ''}`}>{s.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Department Performance ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h2 style={{ display:'flex',alignItems:'center',gap:10 }}><HospitalIcon size={18} /> Department Performance</h2></div>
            <div className="card-body" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14 }}>
              {depts.map(d=>(
                <div key={d.department} style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 14px',textAlign:'center' }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:'rgba(11,94,107,0.08)',color:'var(--brand-teal)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px' }}>
                    <HospitalIcon size={19} />
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,color:'var(--brand-navy)',marginBottom:8 }}>{d.department}</div>
                  <div style={{ display:'flex',justifyContent:'space-around',fontSize:12 }}>
                    <div><div style={{ fontWeight:700,color:'var(--brand-teal)' }}>{d.nurse_count}</div><div style={{ color:'var(--text-muted)' }}>Nurses</div></div>
                    <div><div style={{ fontWeight:700,color:'#166534' }}>{d.total_tasks}</div><div style={{ color:'var(--text-muted)' }}>Tasks</div></div>
                    <div><div style={{ fontWeight:700,color:'var(--brand-gold-deep)' }}>{d.pending_tasks}</div><div style={{ color:'var(--text-muted)' }}>Pending</div></div>
                  </div>
                </div>
              ))}
              {depts.length === 0 && (
                <div style={{ gridColumn:'1 / -1', textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
                  No department data available yet.
                </div>
              )}
            </div>
          </div>

          {/* ── Tabbed Section ── */}
          <div className="card">
            <div className="card-header" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
              <div style={{ display:'flex',gap:8 }}>
                {[['nurses',     <NurseIcon size={14} />, 'Nurses'],
                  ['tasks',      <TaskIcon size={14} />, 'Task History'],
                  ['dept-heads', <UserIcon size={14} />, 'Dept Heads']].map(([t, icon, l])=>(
                  <button key={t} onClick={()=>setTab(t)}
                    style={{ padding:'7px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                      display:'inline-flex',alignItems:'center',gap:6,
                      background: tab===t ? 'var(--brand-gold)' : 'var(--secondary)',
                      color: tab===t ? 'var(--brand-navy)' : 'var(--text)',
                      boxShadow: tab===t ? '0 4px 12px rgba(201,162,75,0.3)' : 'none',
                      transition:'all .15s' }}>
                    {icon} {l}
                  </button>
                ))}
              </div>
              {tab==='dept-heads' && (
                <button className="btn btn-primary" style={{ fontSize:12,padding:'6px 14px',display:'inline-flex',alignItems:'center',gap:6 }}
                  onClick={()=>setShowDeptModal(true)}>
                  <PlusIcon size={14} /> Create Dept Head
                </button>
              )}
            </div>

            {/* NURSES TAB */}
            {tab==='nurses' && (
              <div className="card-body">
                <div style={{ display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center' }}>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',display:'flex' }}><SearchIcon size={14} /></span>
                    <input style={{ ...inp,maxWidth:240,margin:0,paddingLeft:32 }} placeholder="Search nurse…" value={search} onChange={e=>setSearch(e.target.value)} />
                  </div>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {SPECS.map(s=>(
                      <button key={s} onClick={()=>setSpecFilter(s)}
                        style={{ padding:'5px 12px',borderRadius:20,border:`1px solid ${specFilter===s?'var(--brand-cyan)':'var(--border)'}`,
                          background:specFilter===s?'var(--brand-cyan)':'#fff',
                          color:specFilter===s?'#fff':'var(--text)',
                          fontSize:12,cursor:'pointer',fontWeight:specFilter===s?700:400 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredNurses.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'28px 0',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ display:'flex',justifyContent:'center',opacity:0.35,marginBottom:8 }}><NurseIcon size={30} /></div>No nurses match your filter.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr>
                        {['Nurse','Specialization','Email'].map(h=><th key={h}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {filteredNurses.map(n=>(
                          <tr key={n.id}>
                            <td><strong style={{ fontSize:13 }}>{n.full_name}</strong></td>
                            <td><span style={{ background:'rgba(18,151,169,0.1)',color:'var(--brand-teal)',border:'1px solid rgba(18,151,169,0.3)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{n.specialization}</span></td>
                            <td style={{ fontSize:12,color:'var(--text-muted)' }}>{n.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {tab==='tasks' && (
              <div className="card-body" style={{ padding:0 }}>
                {tasks.length === 0 ? (
                  <div style={{ textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:13 }}>No tasks assigned yet.</div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr>
                        {['Nurse','Task','Priority','Ward','Date','Status'].map(h=><th key={h}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {tasks.map(t=>{
                          const pb=PBADGE[t.priority]||PBADGE.routine;
                          const sb=SBADGE[t.status]||SBADGE.assigned;
                          return (
                            <tr key={t.id}>
                              <td><strong style={{ fontSize:13 }}>{t.nurse_name}</strong><div style={{ fontSize:11,color:'var(--text-muted)' }}>{t.specialization}</div></td>
                              <td><div style={{ fontSize:13,fontWeight:600 }}>{t.task_title}</div><div style={{ fontSize:11,color:'var(--text-muted)' }}>{t.task_type}</div></td>
                              <td><span className="badge" style={{ background:pb.bg,color:pb.c }}>{t.priority}</span></td>
                              <td style={{ fontSize:12 }}>{t.ward}</td>
                              <td style={{ fontSize:12 }}>{t.shift_date}<div style={{ color:'var(--text-muted)' }}>{t.shift_time}</div></td>
                              <td><span className="badge" style={{ background:sb.bg,color:sb.c }}>{sb.l}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* DEPT HEADS TAB */}
            {tab==='dept-heads' && (
              <div className="card-body" style={{ padding:0 }}>
                {deptHeads.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'32px 20px',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ display:'flex',justifyContent:'center',opacity:0.35,marginBottom:8 }}><UserIcon size={32} /></div>
                    No dept heads created yet.<br />
                    <button className="btn btn-primary" style={{ marginTop:12,display:'inline-flex',alignItems:'center',gap:6 }} onClick={()=>setShowDeptModal(true)}>
                      <PlusIcon size={14} /> Create First Dept Head
                    </button>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr>
                        {['Name','Email','Department'].map(h=><th key={h}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {deptHeads.map(d=>(
                          <tr key={d.id}>
                            <td><strong style={{ fontSize:13 }}>{d.full_name}</strong></td>
                            <td style={{ fontSize:12,color:'var(--text-muted)' }}>{d.email}</td>
                            <td><span style={{ background:'rgba(20,43,61,0.07)',color:'#142B3D',border:'1px solid rgba(20,43,61,0.25)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600,display:'inline-flex',alignItems:'center',gap:5 }}>
                              <HospitalIcon size={12} /> {d.department}
                            </span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Overlays */}
          {showDeptModal && <DeptHeadModal onClose={()=>setShowDeptModal(false)} onDone={()=>{setShowDeptModal(false);loadAll();setTab('dept-heads');}} onCreated={(d)=>setCreatedDeptHead(d)} />}

          {/* ── Password Reveal Modal ── */}
          {createdDeptHead && (
            <div style={{ position:'fixed',inset:0,zIndex:2000,background:'rgba(20,43,61,0.55)',display:'flex',justifyContent:'center',alignItems:'center' }}
              onClick={() => setCreatedDeptHead(null)}>
              <div style={{ background:'#fff',borderRadius:16,padding:32,width:460,boxShadow:'0 20px 60px rgba(9,25,38,0.25)',textAlign:'center' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ width:56,height:56,borderRadius:16,background:'rgba(201,162,75,0.14)',color:'var(--brand-gold-deep)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px' }}>
                  <CheckIcon size={26} />
                </div>
                <h2 style={{ fontSize:18,fontWeight:700,margin:'0 0 4px',fontFamily:'var(--font-display)',color:'var(--brand-navy)' }}>Dept Head Created!</h2>
                <p style={{ fontSize:13,color:'var(--text-muted)',margin:'0 0 20px' }}>Account is active. Share credentials with the user.</p>
                <div style={{ background:'var(--bg)',borderRadius:12,padding:20,marginBottom:20,textAlign:'left' }}>
                  <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:8 }}><strong>{createdDeptHead.full_name}</strong></div>
                  <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:16 }}>{createdDeptHead.email}  |  {createdDeptHead.department}</div>
                  <div style={{ fontSize:12,color:'#9C7B2E',background:'rgba(201,162,75,0.14)',border:'1px solid rgba(201,162,75,0.4)',padding:'8px 12px',borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                    <KeyIcon size={13} /> Temporary Password
                  </div>
                  <input id="dh-temp-pw" readOnly value={createdDeptHead.temp_password}
                    style={{ background:'#fff',border:'2px dashed rgba(201,162,75,0.6)',borderRadius:8,padding:'12px 16px',fontFamily:'monospace',fontSize:18,fontWeight:700,letterSpacing:1,color:'var(--brand-gold-deep)',marginBottom:12,width:'100%',textAlign:'center',outline:'none',boxSizing:'border-box',cursor:'text' }} />
                  <button
                    onClick={() => { try { navigator.clipboard.writeText(createdDeptHead.temp_password); toast.success('Password copied!'); } catch { const el = document.getElementById('dh-temp-pw'); if (el) { el.select(); document.execCommand('copy'); toast.success('Password copied!'); } } }}
                    style={{ padding:'8px 20px',borderRadius:8,border:'1px solid var(--border)',background:'var(--brand-gold)',color:'var(--brand-navy)',cursor:'pointer',fontSize:13,fontWeight:700,width:'100%',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7 }}>
                    <CopyIcon size={14} /> Copy Password
                  </button>
                </div>
                <button onClick={() => setCreatedDeptHead(null)} className="btn btn-primary" style={{ width:'100%' }}>
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
const inp = { width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',boxSizing:'border-box' };
