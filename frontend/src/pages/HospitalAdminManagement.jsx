import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  createHospitalAdmin, listHospitalAdmins, toggleHospitalAdminActive,
} from '../api/endpoints';
import toast from 'react-hot-toast';
import { HospitalIcon, PlusIcon, CheckIcon, XIcon, BanIcon, ClockIcon, PackageIcon, CopyIcon, KeyIcon } from '../components/BrandIcons';

const REASONS = [
  'Contract expired', 'Violation of terms', 'Inactivity',
  'Duplicate account', 'Requested by hospital', 'Other',
];

function DeactivateModal({ admin, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    const final = reason === 'Other' ? custom : reason;
    if (!final) return toast.error('Select or enter a reason');
    setBusy(true);
    try {
      await onConfirm(final);
      toast.success(`Deactivated ${admin.full_name}`);
      onClose();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:2000,background:'rgba(20,43,61,0.55)',display:'flex',justifyContent:'center',alignItems:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff',borderRadius:16,padding:28,width:460,boxShadow:'0 20px 60px rgba(9,25,38,0.25)' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'rgba(220,38,38,0.1)',color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <BanIcon size={20} />
          </div>
          <h2 style={{ fontSize:17,fontWeight:700,margin:0,fontFamily:'var(--font-display)',color:'var(--brand-navy)' }}>Deactivate Account</h2>
        </div>
        <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:16 }}>
          Deactivating <strong>{admin.full_name}</strong> ({admin.email}). Select a reason.
        </p>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {REASONS.map(r => (
            <label key={r} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:8,border:`1px solid ${reason===r?'var(--brand-gold)':'var(--border)'}`,background:reason===r?'rgba(201,162,75,0.1)':'#fff',cursor:'pointer',fontSize:13,fontWeight:reason===r?600:400 }}>
              <input type="radio" name="reason" value={r} checked={reason===r} onChange={() => setReason(r)} style={{ accentColor:'var(--brand-gold-deep)' }} />
              {r}
            </label>
          ))}
        </div>
        {reason === 'Other' && (
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:4 }}>Specify reason *</label>
            <input style={{ width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',boxSizing:'border-box' }}
              placeholder="Enter reason…" value={custom} onChange={e => setCustom(e.target.value)} />
          </div>
        )}
        <div style={{ display:'flex',gap:10 }}>
          <button className="btn btn-outline" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" style={{ flex:2, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}
            onClick={handleConfirm} disabled={busy}>{busy ? 'Deactivating…' : <><BanIcon size={15} /> Confirm Deactivation</>}</button>
        </div>
      </div>
    </div>
  );
}

export default function HospitalAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email:'', full_name:'', hospital_name:'' });
  const [creating, setCreating] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const load = async () => {
    try {
      const res = await listHospitalAdmins();
      setAdmins(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const activeAdmins   = admins.filter(a => a.admin_role === 'hospital_admin' && a.status === 'active');
  const pendingAdmins  = admins.filter(a => a.admin_role === 'hospital_admin' && a.status === 'pending');
  const archivedAdmins = admins.filter(a => a.admin_role === 'hospital_admin' && a.status === 'deactivated');

  const visible = tab === 'pending' ? pendingAdmins : tab === 'archived' ? archivedAdmins : activeAdmins;

  const handleCreate = async () => {
    const { email, full_name, hospital_name } = form;
    if (!email || !full_name || !hospital_name) return toast.error('All fields required');
    setCreating(true);
    try {
      const res = await createHospitalAdmin(form);
      setCreatedAccount(res.data);
      toast.success(`Created for ${hospital_name}! Pending activation.`);
      await load();
      setForm({ email:'', full_name:'', hospital_name:'' });
      setShowForm(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleActivate = async (id) => {
    try {
      const res = await toggleHospitalAdminActive(id);
      toast.success(res.data.message);
      await load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleDeactivate = async (id, reason) => {
    const res = await toggleHospitalAdminActive(id, { reason });
    toast.success(res.data.message);
    await load();
  };

  return (
    <AppLayout title="Hospital Admin Management">
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="card">
          <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div>
              <h2 style={{ display:'flex', alignItems:'center', gap:10 }}><HospitalIcon size={18} /> Hospital Admins ({admins.filter(a => a.admin_role === 'hospital_admin').length})</h2>
              <p style={{ fontSize:12, color:'var(--text-muted)', margin:'2px 0 0' }}>
                <span style={{ color:'#166534', fontWeight:600 }}>{activeAdmins.length} active</span> · <span style={{ color:'#9C7B2E', fontWeight:600 }}>{pendingAdmins.length} pending</span> · {archivedAdmins.length} archived
              </p>
            </div>
            <button className="btn btn-primary" style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:8 }}
              onClick={() => setShowForm(s => !s)}>
              {showForm ? <><XIcon size={15} /> Cancel</> : <><PlusIcon size={15} /> Create Hospital Admin</>}
            </button>
          </div>

          {showForm && (
            <div style={{ borderBottom:'1px solid var(--border)', background:'var(--bg)', padding:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12, marginBottom:14 }}>
                {[['full_name','Full Name','Dr. Admin Name','text'],['email','Email','admin@hospital.com','email'],['hospital_name','Hospital Name','City General Hospital','text']]
                  .map(([k,label,ph,type]) => (
                    <div key={k}>
                      <label style={lbl}>{label} *</label>
                      <input style={inp} type={type} placeholder={ph}
                        value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} />
                    </div>
                  ))}
              </div>
              <button className="btn btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:8 }} disabled={creating} onClick={handleCreate}>
                {creating ? 'Creating…' : <><PlusIcon size={15} /> Create Account (Pending)</>}
              </button>
            </div>
          )}

          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
            {[
              ['active',   'Active',    activeAdmins.length,   <CheckIcon size={14} />],
              ['pending',  'Pending',   pendingAdmins.length,  <ClockIcon size={14} />],
              ['archived', 'Archived',  archivedAdmins.length, <PackageIcon size={14} />],
            ].map(([t, l, count, icon]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'10px 18px', fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:6,
                  background: tab===t ? '#fff' : 'transparent', color: tab===t ? 'var(--brand-gold-deep)' : 'var(--text-muted)',
                  borderBottom: tab===t ? '2px solid var(--brand-gold)' : '2px solid transparent', transition:'all 0.15s' }}>
                {icon} {l} ({count})
              </button>
            ))}
          </div>

          <div className="card-body" style={{ padding: visible.length === 0 ? 24 : 0 }}>
            {visible.length === 0 ? (
              <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:12 }}>
                {tab === 'archived' ? 'No archived accounts.' : tab === 'pending' ? 'No pending accounts.' : 'No active accounts.'}
              </p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr>
                    {['Name','Email','Hospital','Status', tab === 'archived' ? 'Reason' : 'Action'].map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {visible.map(a => (
                      <tr key={a.id}>
                        <td><strong style={{ fontSize:13 }}>{a.full_name}</strong></td>
                        <td style={{ fontSize:12, color:'var(--text-muted)' }}>{a.email}</td>
                        <td>
                          <span style={{ background:'rgba(20,43,61,0.07)', color:'#142B3D', border:'1px solid rgba(20,43,61,0.25)', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:5 }}>
                            <HospitalIcon size={12} /> {a.hospital_name}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{
                            display:'inline-flex', alignItems:'center', gap:5,
                            background: a.status === 'active' ? '#eafaf1' : a.status === 'pending' ? '#fef9e7' : '#fdedec',
                            color: a.status === 'active' ? '#166534' : a.status === 'pending' ? '#b7950b' : '#991b1b',
                          }}>
                            {a.status === 'active' ? <CheckIcon size={11} /> : a.status === 'pending' ? <ClockIcon size={11} /> : <BanIcon size={11} />}
                            {a.status === 'active' ? 'Active' : a.status === 'pending' ? 'Pending' : 'Deactivated'}
                          </span>
                        </td>
                        {tab === 'archived' ? (
                          <td style={{ fontSize:12, color:'var(--text-muted)', maxWidth:220 }}>{a.deactivation_reason || '—'}</td>
                        ) : (
                          <td>
                            {a.status === 'active' ? (
                              <button onClick={() => setDeactivating(a)}
                                style={{ padding:'4px 12px', borderRadius:6, border:'1px solid rgba(220,38,38,0.4)', cursor:'pointer', fontSize:11, fontWeight:600, background:'#fdedec', color:'#991b1b', display:'inline-flex', alignItems:'center', gap:5 }}>
                                <BanIcon size={12} /> Deactivate
                              </button>
                            ) : (
                              <button onClick={() => handleActivate(a.id)}
                                style={{ padding:'4px 12px', borderRadius:6, border:'1px solid rgba(30,132,73,0.4)', cursor:'pointer', fontSize:11, fontWeight:600, background:'#eafaf1', color:'#166534', display:'inline-flex', alignItems:'center', gap:5 }}>
                                <CheckIcon size={12} /> Activate
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {createdAccount && (
        <div style={{ position:'fixed',inset:0,zIndex:2000,background:'rgba(20,43,61,0.55)',display:'flex',justifyContent:'center',alignItems:'center' }}
          onClick={() => setCreatedAccount(null)}>
          <div style={{ background:'#fff',borderRadius:16,padding:32,width:460,boxShadow:'0 20px 60px rgba(9,25,38,0.25)',textAlign:'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width:56,height:56,borderRadius:16,background:'rgba(201,162,75,0.14)',color:'var(--brand-gold-deep)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px' }}>
              <KeyIcon size={28} />
            </div>
            <h2 style={{ fontSize:18,fontWeight:700,margin:'0 0 4px',fontFamily:'var(--font-display)',color:'var(--brand-navy)' }}>Hospital Admin Created!</h2>
            <p style={{ fontSize:13,color:'var(--text-muted)',margin:'0 0 20px' }}>Account is <strong>Pending</strong> — activate below.</p>
            <div style={{ background:'var(--bg)',borderRadius:12,padding:20,marginBottom:20,textAlign:'left' }}>
              <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:8 }}><strong>{createdAccount.full_name}</strong></div>
              <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:16 }}>{createdAccount.email}  |  {createdAccount.hospital_name}</div>
              <div style={{ fontSize:12,color:'#9C7B2E',background:'rgba(201,162,75,0.14)',border:'1px solid rgba(201,162,75,0.4)',padding:'8px 12px',borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                <KeyIcon size={13} /> Temporary Password
              </div>
              <input id="ha-temp-pw" readOnly value={createdAccount.temp_password}
                style={{ background:'#fff',border:'2px dashed rgba(201,162,75,0.6)',borderRadius:8,padding:'12px 16px',fontFamily:'monospace',fontSize:18,fontWeight:700,letterSpacing:1,color:'var(--brand-gold-deep)',marginBottom:12,width:'100%',textAlign:'center',outline:'none',boxSizing:'border-box',cursor:'text' }} />
              <button onClick={() => { try { navigator.clipboard.writeText(createdAccount.temp_password); toast.success('Password copied!'); } catch { const el = document.getElementById('ha-temp-pw'); if (el) { el.select(); document.execCommand('copy'); toast.success('Password copied!'); } } }}
                style={{ padding:'8px 20px',borderRadius:8,border:'1px solid var(--border)',background:'var(--brand-gold)',color:'var(--brand-navy)',cursor:'pointer',fontSize:13,fontWeight:700,width:'100%',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7 }}>
                <CopyIcon size={14} /> Copy Password
              </button>
            </div>
            <button onClick={() => setCreatedAccount(null)} className="btn btn-primary" style={{ width:'100%' }}>I've Saved the Password — Close</button>
          </div>
        </div>
      )}

      {deactivating && (
        <DeactivateModal admin={deactivating} onClose={() => setDeactivating(null)}
          onConfirm={(reason) => handleDeactivate(deactivating.id, reason)} />
      )}
    </AppLayout>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', fontSize:13, outline:'none', boxSizing:'border-box' };
