import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { sendOtp, changePassword } from '../api/endpoints';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const { user, mustResetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mustResetPassword) {
      navigate('/set-password', { replace: true });
    }
  }, [mustResetPassword, navigate]);

  return (
    <AppLayout title="👤 Profile Settings">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Profile Info */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h2>Account Info</h2></div>
          <div className="card-body">
            <div style={{ display:'grid', gap: 14 }}>
              <div><label style={lbl}>Name</label><div style={val}>{user?.full_name || '—'}</div></div>
              <div><label style={lbl}>Email</label><div style={val}>{user?.email || '—'}</div></div>
              <div><label style={lbl}>Role</label><div style={val}>
                {user?.admin_role === 'dept_head' ? 'Department Head'
                  : user?.admin_role === 'hospital_admin' ? 'Hospital Admin'
                  : user?.role === 'admin' ? 'Platform Admin' : 'Nurse'}
              </div></div>
              {user?.hospital_name && <div><label style={lbl}>Hospital</label><div style={val}>{user.hospital_name}</div></div>}
              {user?.department && <div><label style={lbl}>Department</label><div style={val}>{user.department}</div></div>}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <ChangePasswordSection />
      </div>
    </AppLayout>
  );
}

function ChangePasswordSection() {
  const [f, setF] = useState({ current_password: '', new_password: '', confirm_password: '', otp: '' });
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'done'
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handleSendOtp = async () => {
    if (!f.current_password) return toast.error('Enter your current password');
    if (!f.new_password) return toast.error('Enter a new password');
    if (f.new_password.length < 6) return toast.error('New password must be at least 6 characters');
    if (f.new_password !== f.confirm_password) return toast.error('Passwords do not match');
    if (f.current_password === f.new_password) return toast.error('New password must differ from current password');
    setBusy(true);
    try {
      await sendOtp();
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to send OTP'); }
    finally { setBusy(false); }
  };

  const handleChangePassword = async () => {
    if (!f.otp) return toast.error('Enter the OTP sent to your email');
    setBusy(true);
    try {
      await changePassword({
        current_password: f.current_password,
        new_password: f.new_password,
        otp: f.otp,
      });
      toast.success('Password changed successfully!');
      setStep('done');
      setF({ current_password: '', new_password: '', confirm_password: '', otp: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to change password'); }
    finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div className="card-header"><h2>🔑 Change Password</h2></div>
      <div className="card-body">
        {step === 'done' ? (
          <div style={{ textAlign:'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Password changed successfully!</p>
            <button className="btn btn-outline" style={{ marginTop: 12 }}
              onClick={() => setStep('form')}>Change Again</button>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Current Password *</label>
              <input type="password" value={f.current_password}
                onChange={e => set('current_password', e.target.value)} disabled={step === 'otp'} />
            </div>
            <div className="form-group">
              <label>New Password *</label>
              <input type="password" value={f.new_password}
                onChange={e => set('new_password', e.target.value)} disabled={step === 'otp'} />
            </div>
            <div className="form-group">
              <label>Confirm New Password *</label>
              <input type="password" value={f.confirm_password}
                onChange={e => set('confirm_password', e.target.value)} disabled={step === 'otp'} />
            </div>

            {step === 'form' && (
              <button className="btn btn-primary btn-full mt-2" onClick={handleSendOtp} disabled={busy}>
                {busy ? <><span className="spinner" /> Sending OTP…</> : '📧 Send OTP to Email'}
              </button>
            )}

            {step === 'otp' && (
              <>
                <div className="form-group">
                  <label>OTP (sent to your email) *</label>
                  <input type="text" placeholder="6-digit code" maxLength={6}
                    value={f.otp} onChange={e => set('otp', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                </div>
                <div style={{ display:'flex', gap: 10 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }}
                    onClick={() => setStep('form')}>Back</button>
                  <button className="btn btn-primary" style={{ flex: 2 }}
                    onClick={handleChangePassword} disabled={busy}>
                    {busy ? <><span className="spinner" /> Changing…</> : '🔑 Change Password'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
                  Didn't receive it? <button className="btn btn-outline" style={{ padding:'2px 10px', fontSize: 12 }}
                    onClick={handleSendOtp} disabled={busy}>Resend OTP</button>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 };
const val = { fontSize:14, fontWeight:600, color:'var(--text)', padding:'6px 0' };
