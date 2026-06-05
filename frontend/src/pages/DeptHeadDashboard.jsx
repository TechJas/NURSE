import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { getDeptStats, getDeptNurses, assignDeptTask, getDeptTasks } from '../api/endpoints';
import toast from 'react-hot-toast';

const TYPES  = ['Patient Care','Emergency Response','Medication Administration','Patient Monitoring','Ward Rounds','Triage'];
const PRIOS  = [{v:'emergency',l:'🔴 Emergency'},{v:'urgent',l:'🟡 Urgent'},{v:'routine',l:'🟢 Routine'}];
const PBADGE = { emergency:{bg:'#fef2f2',c:'#b91c1c',i:'🔴'}, urgent:{bg:'#fffbeb',c:'#92400e',i:'🟡'}, routine:{bg:'#f0fdf4',c:'#166534',i:'🟢'} };
const SBADGE = { assigned:{bg:'#eff6ff',c:'#1d4ed8',l:'📋 Assigned'}, acknowledged:{bg:'#f0fdf4',c:'#166534',l:'✅ Acknowledged'}, completed:{bg:'#f8fafc',c:'#475569',l:'☑️ Completed'} };
const today  = new Date().toISOString().split('T')[0];

// ─── Slide-in Assign Panel ──────────────────────────────────────────────────
function AssignPanel({ nurse, dept, onClose, onDone }) {
  const [f, setF] = useState({ task_title:'', task_type:TYPES[0], priority:'routine', ward:'', floor:'', shift_date:today, shift_time:'08:00', task_notes:'' });
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = async () => {
    if (!f.task_title.trim()) return toast.error('Task title required');
    if (!f.ward.trim())       return toast.error('Ward required');
    setBusy(true);
    try {
      await assignDeptTask({ nurse_id: nurse.id, ...f, specialization_required: dept });
      toast.success(`Task assigned to ${nurse.full_name}!`);
      onDone();
    } catch(e) { toast.error(e.response?.data?.detail || 'Assignment failed'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.45)',display:'flex',justifyContent:'flex-end' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:440,height:'100%',background:'#fff',overflowY:'auto',boxShadow:'-8px 0 32px rgba(0,0,0,0.18)',padding:'28px 24px',animation:'slideIn .25s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:16,fontWeight:700,margin:0 }}>📋 Assign Task</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#6b7280' }}>✕</button>
        </div>

        {/* Nurse info chip */}
        <div style={{ background:'linear-gradient(135deg,#ede9fe,#f3e8ff)',borderRadius:12,padding:'14px 16px',marginBottom:20,border:'1px solid #c4b5fd' }}>
          <div style={{ fontWeight:700,fontSize:14,color:'#5b21b6' }}>👩‍⚕️ {nurse.full_name}</div>
          <div style={{ fontSize:12,color:'#7c3aed',marginTop:2 }}>{nurse.specialization} · {nurse.email}</div>
        </div>

        {/* Form fields */}
        {[['task_title','Task Title *','e.g. ICU Patient Monitoring'],['ward','Ward / Location *','e.g. Ward B, Room 203'],['floor','Floor','e.g. 2nd Floor']].map(([k,label,ph])=>(
          <div key={k} style={{ marginBottom:14 }}>
            <label style={lbl}>{label}</label>
            <input style={inp} placeholder={ph} value={f[k]} onChange={e=>set(k,e.target.value)} />
          </div>
        ))}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
          <div><label style={lbl}>Task Type</label>
            <select style={inp} value={f.task_type} onChange={e=>set('task_type',e.target.value)}>
              {TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Priority</label>
            <select style={inp} value={f.priority} onChange={e=>set('priority',e.target.value)}>
              {PRIOS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Date *</label>
            <input style={inp} type="date" min={today} value={f.shift_date} onChange={e=>set('shift_date',e.target.value)} />
          </div>
          <div><label style={lbl}>Time</label>
            <input style={inp} type="time" value={f.shift_time} onChange={e=>set('shift_time',e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Notes</label>
          <textarea style={{ ...inp,height:70,resize:'vertical' }} value={f.task_notes} onChange={e=>set('task_notes',e.target.value)} placeholder="Additional instructions…" />
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button className="btn btn-outline" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2,background:'#7c3aed' }} onClick={submit} disabled={busy}>{busy?'Assigning…':'✅ Assign Task'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function DeptHeadDashboard({ defaultTab }) {
  const { user } = useAuth();
  const dept = user?.department || 'Department';

  const [stats,   setStats]   = useState(null);
  const [nurses,  setNurses]  = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [assignTo,setAssignTo]= useState(null);
  const [tab,     setTab]     = useState(defaultTab || 'nurses');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, nRes, tRes] = await Promise.all([
        getDeptStats(), getDeptNurses(), getDeptTasks(),
      ]);
      setStats(sRes.data);
      setNurses(Array.isArray(nRes.data) ? nRes.data : []);
      setTasks(Array.isArray(tRes.data) ? tRes.data : []);
    } catch { toast.error('Failed to load department data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    setTab(defaultTab || 'nurses');
  }, [defaultTab]);

  const filtered = nurses.filter(n => !search || n.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout title={`${dept} Department`}>
      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Dept Banner ── */}
          <div style={{ background:'linear-gradient(135deg,#5b21b6,#7c3aed 60%,#a78bfa)',borderRadius:16,padding:'24px 28px',marginBottom:24,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <div style={{ fontSize:12,opacity:.7,letterSpacing:1,textTransform:'uppercase',marginBottom:4 }}>Department Head</div>
              <div style={{ fontSize:24,fontWeight:800 }}>{dept}</div>
              <div style={{ fontSize:13,opacity:.8,marginTop:4 }}>Welcome, {user?.full_name || user?.email}</div>
            </div>
            <div style={{ fontSize:52,opacity:.25 }}>🩺</div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24 }}>
            {[
              { label:'Nurses',      value: stats?.nurse_count  ?? 0, icon:'👩‍⚕️', bg:'#ede9fe', border:'#c4b5fd' },
              { label:'Total Tasks', value: stats?.total_tasks  ?? 0, icon:'📋',  bg:'#f0fdf4', border:'#86efac' },
              { label:'Pending',     value: stats?.pending      ?? 0, icon:'⏳',  bg:'#fef9e7', border:'#fcd34d' },
              { label:'Acknowledged',value: stats?.acknowledged ?? 0, icon:'✅',  bg:'#eff6ff', border:'#93c5fd' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,border:`1px solid ${s.border}`,borderRadius:14,padding:'16px 18px',display:'flex',alignItems:'center',gap:12 }}>
                <span style={{ fontSize:26 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:24,fontWeight:800,color:'var(--text)' }}>{s.value}</div>
                  <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:1 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabbed Section ── */}
          <div className="card">
            <div className="card-header" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
              <div style={{ display:'flex',gap:8 }}>
                {[['nurses','👩‍⚕️ My Nurses'],['tasks','📋 Task History']].map(([t,l])=>(
                  <button key={t} onClick={()=>setTab(t)}
                    style={{ padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                      background: tab===t ? '#7c3aed' : '#f3f4f6',
                      color: tab===t ? '#fff' : 'var(--text)',
                      transition:'all .15s' }}>
                    {l}
                  </button>
                ))}
              </div>
              {tab==='nurses' && (
                <input style={{ ...inp,maxWidth:220,margin:0 }} placeholder="🔍 Search nurse…" value={search} onChange={e=>setSearch(e.target.value)} />
              )}
            </div>

            {/* NURSES TAB */}
            {tab==='nurses' && (
              <div className="card-body" style={{ padding:0 }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'32px 20px',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ fontSize:28,marginBottom:8 }}>👩‍⚕️</div>No {dept} nurses found.
                  </div>
                ) : (
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>
                      {['Nurse','Specialization','Email','Action'].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filtered.map(n=>(
                        <tr key={n.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={td}><strong style={{ fontSize:13 }}>{n.full_name}</strong></td>
                          <td style={td}><span style={{ background:'#ede9fe',color:'#7c3aed',border:'1px solid #c4b5fd',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{n.specialization}</span></td>
                          <td style={{ ...td,fontSize:12,color:'var(--text-muted)' }}>{n.email}</td>
                          <td style={td}><button className="btn btn-primary" style={{ padding:'5px 12px',fontSize:11,background:'#7c3aed' }} onClick={()=>setAssignTo(n)}>✅ Assign Task</button></td>
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
                  <div style={{ textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:13 }}>No tasks assigned yet for {dept}.</div>
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
                            <td style={td}><strong style={{ fontSize:13 }}>{t.nurse_name}</strong></td>
                            <td style={td}><div style={{ fontSize:13,fontWeight:600 }}>{t.task_title}</div><div style={{ fontSize:11,color:'var(--text-muted)' }}>{t.task_type}</div></td>
                            <td style={td}><span style={{ background:pb.bg,color:pb.c,borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700 }}>{pb.i} {t.priority}</span></td>
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
          </div>

          {/* Assign overlay */}
          {assignTo && <AssignPanel nurse={assignTo} dept={dept} onClose={()=>setAssignTo(null)} onDone={()=>{setAssignTo(null);loadAll();}} />}
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
