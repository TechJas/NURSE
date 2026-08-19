import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { getDeptStats, getDeptNurses, assignDeptTask, getDeptTasks } from '../api/endpoints';
import toast from 'react-hot-toast';
import { NurseIcon, TaskIcon, ClockIcon, CheckIcon, PlusIcon, XIcon, SearchIcon, HospitalIcon, CalendarIcon } from '../components/BrandIcons';

const TYPES  = ['Patient Care','Emergency Response','Medication Administration','Patient Monitoring','Ward Rounds','Triage'];
const PRIOS  = [{v:'emergency',l:'Emergency'},{v:'urgent',l:'Urgent'},{v:'routine',l:'Routine'}];
const HOURS  = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINS   = ['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59'];
const PERIODS = ['AM','PM'];
const toMinutes = (h, m, p) => { let hr = parseInt(h); const mi = parseInt(m); if (p === 'AM' && hr === 12) hr = 0; else if (p === 'PM' && hr !== 12) hr += 12; return hr * 60 + mi; };
const minutesToHM = (mins) => { let h24 = Math.floor(mins / 60) % 24; const m = mins % 60; const p = h24 >= 12 ? 'PM' : 'AM'; let h12 = h24 % 12; if (h12 === 0) h12 = 12; return { h: String(h12), m: String(m).padStart(2, '0'), p }; };
const PBADGE = { emergency:{bg:'#fdedec',c:'#b32727'}, urgent:{bg:'rgba(201,162,75,0.14)',c:'#9C7B2E'}, routine:{bg:'#eafaf1',c:'#166534'} };
const SBADGE = { assigned:{bg:'#ebf5fb',c:'#1a5276',l:'Assigned'}, acknowledged:{bg:'#eafaf1',c:'#166534',l:'Acknowledged'}, completed:{bg:'#f0f3f4',c:'#566573',l:'Completed'} };
const _now = new Date();
const today  = _now.getFullYear() + '-' + String(_now.getMonth()+1).padStart(2,'0') + '-' + String(_now.getDate()).padStart(2,'0');

// ─── Slide-in Assign Panel ──────────────────────────────────────────────────
function AssignPanel({ nurse, dept, onClose, onDone }) {
  const [f, setF] = useState({ task_title:'', task_type:TYPES[0], priority:'routine', ward:'', floor:'', shift_date:today, shift_hour:'8', shift_minute:'00', shift_period:'AM', task_notes:'' });
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = f.shift_date === today;

  const hourDisabled   = (h)    => isToday && toMinutes(h, f.shift_minute, f.shift_period) <= nowMin;
  const minuteDisabled = (m)    => isToday && toMinutes(f.shift_hour, m, f.shift_period) <= nowMin;
  const periodDisabled = (p)    => isToday && toMinutes(f.shift_hour, f.shift_minute, p) <= nowMin;

  const handleDateChange = (d) => {
    set('shift_date', d);
    if (d === today) {
      const cur = toMinutes(f.shift_hour, f.shift_minute, f.shift_period);
      if (cur <= nowMin) {
        let nxt = nowMin + 1;
        const h = Math.floor(nxt / 60) % 12 || 12;
        const m = String(nxt % 60).padStart(2, '0');
        const p = nxt < 720 ? 'AM' : 'PM';
        setF(pv => ({ ...pv, shift_date: d, shift_hour: String(h), shift_minute: m, shift_period: p }));
      }
    }
  };

  const submit = async () => {
    if (!f.task_title.trim()) return toast.error('Task title required');
    if (!f.ward.trim())       return toast.error('Ward required');
    setBusy(true);
    try {
      const shift_time = f.shift_hour + ':' + f.shift_minute + ' ' + f.shift_period;
      await assignDeptTask({ nurse_id: nurse.id, ...f, shift_time, specialization_required: dept });
      toast.success(`Task assigned to ${nurse.full_name}!`);
      onDone();
    } catch(e) { toast.error(e.response?.data?.detail || 'Assignment failed'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(20,43,61,0.45)',display:'flex',justifyContent:'flex-end',backdropFilter:'blur(2px)' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:440,height:'100%',background:'#fff',overflowY:'auto',boxShadow:'-8px 0 32px rgba(9,25,38,0.2)',animation:'slideIn .28s cubic-bezier(0.22,1,0.36,1)' }}>
        {/* Navy header */}
        <div style={{ background:'linear-gradient(120deg, #142B3D, #0B5E6B)', padding:'22px 24px', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:'rgba(201,162,75,0.18)',color:'var(--brand-gold)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <TaskIcon size={18} />
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)',fontSize:17,fontWeight:700 }}>Assign Task</div>
              <div style={{ fontSize:11.5,opacity:0.75,marginTop:1 }}>{dept} · Department</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)',border:'none',borderRadius:8,color:'#fff',cursor:'pointer',padding:6,display:'flex' }}><XIcon size={18} /></button>
        </div>

        <div style={{ padding:'20px 24px' }}>
          {/* Nurse info chip */}
          <div style={{ background:'rgba(18,151,169,0.07)',border:'1px solid rgba(18,151,169,0.35)',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:38,height:38,borderRadius:10,background:'rgba(11,94,107,0.1)',color:'var(--brand-teal)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <NurseIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:'var(--brand-navy)' }}>{nurse.full_name}</div>
              <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>{nurse.specialization} · {nurse.email}</div>
            </div>
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
              <input style={inp} type="date" min={today} value={f.shift_date} onChange={e=>handleDateChange(e.target.value)} />
            </div>
            <div><label style={lbl}>Time *</label>
              <div style={{ display:'flex',gap:6 }}>
                <select style={{ ...inp,flex:1 }} value={f.shift_hour} onChange={e=>set('shift_hour',e.target.value)}>
                  {HOURS.map(h=><option key={h} value={h} disabled={hourDisabled(h)} style={hourDisabled(h)?{color:'#bbb'}:{}}>{h}</option>)}
                </select>
                <select style={{ ...inp,flex:1 }} value={f.shift_minute} onChange={e=>set('shift_minute',e.target.value)}>
                  {MINS.map(m=><option key={m} value={m} disabled={minuteDisabled(m)} style={minuteDisabled(m)?{color:'#bbb'}:{}}>{m}</option>)}
                </select>
                <select style={{ ...inp,flex:1 }} value={f.shift_period} onChange={e=>set('shift_period',e.target.value)}>
                  {PERIODS.map(p=><option key={p} value={p} disabled={periodDisabled(p)} style={periodDisabled(p)?{color:'#bbb'}:{}}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp,height:70,resize:'vertical' }} value={f.task_notes} onChange={e=>set('task_notes',e.target.value)} placeholder="Additional instructions…" />
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button className="btn btn-outline" style={{ flex:1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8 }} onClick={submit} disabled={busy}>
              {busy ? 'Assigning…' : <><PlusIcon size={15} /> Assign Task</>}
            </button>
          </div>
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
          <div className="hero-card" style={{ background: 'radial-gradient(480px 240px at 92% -30%, rgba(201,162,75,0.22), transparent 60%), radial-gradient(360px 200px at -10% 120%, rgba(18,151,169,0.3), transparent 60%), linear-gradient(120deg, #142B3D 0%, #0B5E6B 65%, var(--brand-teal) 100%)' }}>
            <div>
              <div className="hero-kicker">Department Head</div>
              <div className="hero-title">{dept}</div>
              <p className="hero-sub">Welcome, {user?.full_name || user?.email}</p>
              <span className="hero-status"><HospitalIcon size={13} /> Dept Head</span>
            </div>
            <div className="hero-icon"><NurseIcon size={44} /></div>
          </div>

          {/* ── Stats Row ── */}
          <div className="stats-grid cols-4" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
            {[
              { label:'Nurses',      value: stats?.nurse_count  ?? 0, icon: <NurseIcon size={22} />,    gold: false },
              { label:'Total Tasks', value: stats?.total_tasks  ?? 0, icon: <TaskIcon size={22} />,     gold: false },
              { label:'Pending',     value: stats?.pending      ?? 0, icon: <ClockIcon size={22} />,    gold: true },
              { label:'Acknowledged',value: stats?.acknowledged ?? 0, icon: <CheckIcon size={22} />,    gold: false },
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

          {/* ── Tabbed Section ── */}
          <div className="card">
            <div className="card-header" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
              <div style={{ display:'flex',gap:8 }}>
                {[['nurses', <NurseIcon size={14} />, 'My Nurses'], ['tasks', <TaskIcon size={14} />, 'Task History']].map(([t, icon, l])=>(
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
              {tab==='nurses' && (
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',display:'flex' }}><SearchIcon size={14} /></span>
                  <input style={{ ...inp,maxWidth:220,margin:0,paddingLeft:32 }} placeholder="Search nurse…" value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
              )}
            </div>

            {/* NURSES TAB */}
            {tab==='nurses' && (
              <div className="card-body" style={{ padding:0 }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'32px 20px',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ display:'flex',justifyContent:'center',opacity:0.35,marginBottom:8 }}><NurseIcon size={30} /></div>No {dept} nurses found.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr>
                        {['Nurse','Specialization','Email','Action'].map(h=><th key={h}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {filtered.map(n=>(
                          <tr key={n.id}>
                            <td><strong style={{ fontSize:13 }}>{n.full_name}</strong></td>
                            <td><span style={{ background:'rgba(18,151,169,0.1)',color:'var(--brand-teal)',border:'1px solid rgba(18,151,169,0.3)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{n.specialization}</span></td>
                            <td style={{ fontSize:12,color:'var(--text-muted)' }}>{n.email}</td>
                            <td><button className="btn btn-primary" style={{ padding:'5px 12px',fontSize:11,display:'inline-flex',alignItems:'center',gap:6 }} onClick={()=>setAssignTo(n)}>
                              <PlusIcon size={13} /> Assign Task
                            </button></td>
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
                  <div style={{ textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:13 }}>No tasks assigned yet for {dept}.</div>
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
                              <td><strong style={{ fontSize:13 }}>{t.nurse_name}</strong></td>
                              <td><div style={{ fontSize:13,fontWeight:600 }}>{t.task_title}</div><div style={{ fontSize:11,color:'var(--text-muted)' }}>{t.task_type}</div></td>
                              <td><span className="badge" style={{ background:pb.bg,color:pb.c }}>{t.priority}</span></td>
                              <td style={{ fontSize:12 }}>{t.ward}</td>
                              <td style={{ fontSize:12 }}><CalendarIcon size={12} style={{ verticalAlign:'-2px' }} /> {t.shift_date}<div style={{ color:'var(--text-muted)' }}>{t.shift_time}</div></td>
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
const inp = { width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',boxSizing:'border-box' };
