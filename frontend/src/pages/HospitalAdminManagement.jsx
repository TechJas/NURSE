import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  createHospitalAdmin, listHospitalAdmins, toggleHospitalAdminActive,
} from '../api/endpoints';
import toast from 'react-hot-toast';

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
    <div style={{ position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff',borderRadius:16,padding:28,width:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e=>e.stopPropagation()}>
        <h2 style={{ fontSize:16,fontWeight:700,margin:'0 0 16px' }}>🚫 Deactivate Account</h2>
        <p style={{ fontSize:13,color:'#6b7280',marginBottom:16 }}>
          Deactivating <strong>{admin.full_name}</strong> ({admin.email}). Select a reason.
        </p>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {REASONS.map(r => (
            <label key={r} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:8,border:`1px solid ${reason===r?'#7c3aed':'#e5e7eb'}`,background:reason===r?'#f5f3ff':'#fff',cursor:'pointer',fontSize:13,fontWeight:reason===r?600:400 }}>
              <input type="radio" name="reason" value={r} checked={reason===r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        {reason === 'Other' && (
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:4 }}>Specify reason *</label>
            <input style={{ width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:13,outline:'none',boxSizing:'border-box' }}
              placeholder="Enter reason…" value={custom} onChange={e => setCustom(e.target.value)} />
          </div>
        )}
        <div style={{ display:'flex',gap:10 }}>
          <button className="btn btn-outline" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2,background:'#dc2626',borderColor:'#dc2626' }}
            onClick={handleConfirm} disabled={busy}>{busy ? 'Deactivating…' : '🚫 Confirm Deactivation'}</button>
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
    try {
      const res = await toggleHospitalAdminActive(id, { reason });
      toast.success(res.data.message);
      await load();
    } catch (e) { throw e; }
  };

  return (
    <AppLayout title="🏥 Hospital Admin Management">
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="card">
          <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h2>🏥 Hospital Admins ({admins.filter(a => a.admin_role === 'hospital_admin').length})</h2>
              <p style={{ fontSize:12, color:'var(--text-muted)', margin:'2px 0 0' }}>
                {activeAdmins.length} active · {pendingAdmins.length} pending · {archivedAdmins.length} archived
              </p>
            </div>
            <button className="btn btn-primary" style={{ background:'#7c3aed', flexShrink:0 }}
              onClick={() => setShowForm(s => !s)}>
              {showForm ? '✕ Cancel' : '➕ Create Hospital Admin'}
            </button>
          </div>

          {showForm && (
            <div style={{ borderBottom:'1px solid var(--border)', background:'#fafafa', padding:20 }}>
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
              <button className="btn btn-primary" style={{ background:'#7c3aed' }} disabled={creating} onClick={handleCreate}>
                {creating ? '⏳ Creating…' : '🚀 Create Account (Pending)'}
              </button>
            </div>
          )}

          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', background:'#f9fafb' }}>
            {[
              ['active',   `✅ Active (${activeAdmins.length})`],
              ['pending',  `⏳ Pending (${pendingAdmins.length})`],
              ['archived', `📦 Archived (${archivedAdmins.length})`],
            ].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'10px 18px', fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                  background: tab===t ? '#fff' : 'transparent', color: tab===t ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: tab===t ? '2px solid var(--primary)' : '2px solid transparent', transition:'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>

          <div className="card-body" style={{ padding: visible.length === 0 ? 24 : 0 }}>
            {visible.length === 0 ? (
              <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:12 }}>
                {tab === 'archived' ? 'No archived accounts.' : tab === 'pending' ? 'No pending accounts.' : 'No active accounts.'}
              </p>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f9fafb' }}>
                  {['Name','Email','Hospital','Status', tab === 'archived' ? 'Reason' : 'Action'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {visible.map(a => (
                    <tr key={a.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={td}><strong style={{ fontSize:13 }}>{a.full_name}</strong></td>
                      <td style={{ ...td, fontSize:12, color:'var(--text-muted)' }}>{a.email}</td>
                      <td style={td}>
                        <span style={{ background:'#f3e8ff', color:'#7c3aed', border:'1px solid #c4b5fd', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>🏥 {a.hospital_name}</span>
                      </td>
                      <td style={td}>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background: a.status === 'active' ? '#dcfce7' : a.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: a.status === 'active' ? '#166534' : a.status === 'pending' ? '#92400e' : '#991b1b' }}>
                          {a.status === 'active' ? '✅ Active' : a.status === 'pending' ? '⏳ Pending' : '🚫 Deactivated'}
                        </span>
                      </td>
                      {tab === 'archived' ? (
                        <td style={{ ...td, fontSize:12, color:'#6b7280', maxWidth:200 }}>{a.deactivation_reason || '—'}</td>
                      ) : (
                        <td style={td}>
                          {a.status === 'active' ? (
                            <button onClick={() => setDeactivating(a)}
                              style={{ padding:'4px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:'#fee2e2', color:'#991b1b' }}>🚫 Deactivate</button>
                          ) : (
                            <button onClick={() => handleActivate(a.id)}
                              style={{ padding:'4px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:'#dcfce7', color:'#166534' }}>✅ Activate</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {createdAccount && (
        <div style={{ position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center' }}
          onClick={() => setCreatedAccount(null)}>
          <div style={{ background:'#fff',borderRadius:16,padding:32,width:460,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
            <h2 style={{ fontSize:18,fontWeight:700,margin:'0 0 4px' }}>Hospital Admin Created!</h2>
            <p style={{ fontSize:13,color:'#6b7280',margin:'0 0 20px' }}>Account is <strong>Pending</strong> — activate below.</p>
            <div style={{ background:'#f9fafb',borderRadius:12,padding:20,marginBottom:20,textAlign:'left' }}>
              <div style={{ fontSize:13,color:'#6b7280',marginBottom:8 }}>👤 <strong>{createdAccount.full_name}</strong></div>
              <div style={{ fontSize:13,color:'#6b7280',marginBottom:16 }}>📧 {createdAccount.email}  |  🏥 {createdAccount.hospital_name}</div>
              <div style={{ fontSize:12,color:'#92400e',background:'#fef3c7',padding:'8px 12px',borderRadius:8,marginBottom:12 }}>🔑 Temporary Password</div>
              <input id="ha-temp-pw" readOnly value={createdAccount.temp_password}
                style={{ background:'#fff',border:'2px dashed #d1d5db',borderRadius:8,padding:'12px 16px',fontFamily:'monospace',fontSize:18,fontWeight:700,letterSpacing:1,color:'#1f2937',marginBottom:12,width:'100%',textAlign:'center',outline:'none',boxSizing:'border-box',cursor:'text' }} />
              <button onClick={() => { try { navigator.clipboard.writeText(createdAccount.temp_password); toast.success('Password copied!'); } catch { const el = document.getElementById('ha-temp-pw'); if (el) { el.select(); document.execCommand('copy'); toast.success('Password copied!'); } } }}
                style={{ padding:'8px 20px',borderRadius:8,border:'1px solid #d1d5db',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,width:'100%' }}>📋 Copy Password</button>
            </div>
            <button onClick={() => setCreatedAccount(null)} className="btn btn-primary" style={{ background:'#7c3aed',width:'100%' }}>I've Saved the Password — Close</button>
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

const th  = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' };
const td  = { padding:'12px 14px', verticalAlign:'middle' };
const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#4b5563', marginBottom:5 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:13, outline:'none', boxSizing:'border-box' };
