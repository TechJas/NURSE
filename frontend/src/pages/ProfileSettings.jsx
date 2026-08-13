import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { sendOtp, changePassword } from '../api/endpoints';
import toast from 'react-hot-toast';
import { UserIcon, ShieldIcon, EyeIcon, EyeOffIcon, CheckIcon, MailIcon, XIcon, KeyIcon } from '../components/BrandIcons';

const roleLabel = user => {
  if (user?.admin_role === 'dept_head') return 'Department Head';
  if (user?.admin_role === 'hospital_admin') return 'Hospital Admin';
  if (user?.role === 'admin') return 'Platform Admin';
  return 'Nurse';
};

export default function ProfileSettings() {
  const { user, mustResetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mustResetPassword) {
      navigate('/set-password', { replace: true });
    }
  }, [mustResetPassword, navigate]);

  const infoRows = [
    { label: 'Name', value: user?.full_name || '—' },
    { label: 'Email', value: user?.email || '—' },
    { label: 'Hospital', value: user?.hospital_name || null },
    { label: 'Department', value: user?.department || null },
  ].filter(r => r.value);

  return (
    <AppLayout title="Profile Settings">
      <div className="two-col-grid">
        {/* ── Account Info ── */}
        <div className="card">
          <div className="card-header"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><UserIcon size={18} /> Account Info</h2></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {infoRows.map((r, i) => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  padding: '13px 2px',
                  borderBottom: i < infoRows.length - 1 ? '1px solid rgba(11,94,107,0.15)' : 'none',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{r.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 2px' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Role</span>
                <span className="badge" style={{ background: 'rgba(201,162,75,0.14)', color: '#9C7B2E', border: '1px solid rgba(201,162,75,0.35)', fontSize: 12 }}>
                  {roleLabel(user)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <ChangePasswordSection />
      </div>
    </AppLayout>
  );
}

function ChangePasswordSection() {
  const [f, setF] = useState({ current_password: '', new_password: '', confirm_password: '', otp: '' });
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'done'
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState({ current_password: false, new_password: false, confirm_password: false });
  const digitRefs = useRef([]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleShow = k => setShow(p => ({ ...p, [k]: !p[k] }));

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
    if (f.otp.length < 6) return toast.error('Enter the 6-digit OTP sent to your email');
    setBusy(true);
    try {
      await changePassword({
        current_password: f.current_password,
        new_password: f.new_password,
        otp: f.otp,
      });
      toast.success('Password changed successfully!');
      setStep('done');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to change password'); }
    finally { setBusy(false); }
  };

  const closeModal = () => {
    setStep('form');
    setF({ current_password: '', new_password: '', confirm_password: '', otp: '' });
  };

  const onDigitChange = (idx, val) => {
    const d = val.replace(/\D/g, '');
    if (!d) return;
    const next = f.otp.slice(0, idx) + d + f.otp.slice(idx + 1);
    set('otp', next);
    if (idx < 5) digitRefs.current[idx + 1]?.focus();
  };

  const onDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !f.otp[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="card">
      <div className="card-header"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><KeyIcon size={18} /> Change Password</h2></div>
      <div className="card-body">
        <PasswordField label="Current Password" value={f.current_password} visible={show.current_password}
          onChange={v => set('current_password', v)} onToggle={() => toggleShow('current_password')} disabled={step === 'otp'} />
        <PasswordField label="New Password" value={f.new_password} visible={show.new_password}
          onChange={v => set('new_password', v)} onToggle={() => toggleShow('new_password')} disabled={step === 'otp'} />
        <PasswordField label="Confirm New Password" value={f.confirm_password} visible={show.confirm_password}
          onChange={v => set('confirm_password', v)} onToggle={() => toggleShow('confirm_password')} disabled={step === 'otp'} />

        <button className="btn btn-primary btn-full mt-2" onClick={handleSendOtp} disabled={busy}>
          {busy ? <><span className="spinner" /> Sending OTP…</>
                 : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MailIcon size={16} /> Send OTP to Email</span>}
        </button>
      </div>

      {/* ── OTP Modal ── */}
      {step === 'otp' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,43,61,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420,
            padding: '30px 28px', boxShadow: '0 24px 60px rgba(20,43,61,0.3)',
            animation: 'riseIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>Verify OTP</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XIcon size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              A 6-digit code was sent to your registered email.
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input
                  key={i}
                  ref={el => { digitRefs.current[i] = el; }}
                  value={f.otp[i] || ''}
                  onChange={e => onDigitChange(i, e.target.value)}
                  onKeyDown={e => onDigitKeyDown(i, e)}
                  inputMode="numeric"
                  style={{
                    width: 46, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                    border: f.otp[i] ? '1.5px solid var(--brand-cyan)' : '1.5px solid var(--border)',
                    borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                    background: f.otp[i] ? 'rgba(18,151,169,0.06)' : '#fff',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '11px 0' }} onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, padding: '11px 0' }} onClick={handleChangePassword} disabled={busy}>
                {busy ? <><span className="spinner" /> Verifying…</> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ShieldIcon size={16} /> Verify & Change</span>}
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
              Didn't receive it?{' '}
              <button style={{ background: 'none', border: 'none', color: '#0B5E6B', fontWeight: 700, cursor: 'pointer', fontSize: 12 }} onClick={handleSendOtp} disabled={busy}>
                Resend OTP
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Success state ── */}
      {step === 'done' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,43,61,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{
            background: '#fff', borderRadius: 18, width: '100%', maxWidth: 380, padding: '36px 28px',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(20,43,61,0.3)', animation: 'riseIn 0.3s ease',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(201,162,75,0.14)', color: '#9C7B2E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 6px rgba(201,162,75,0.08)' }}>
              <CheckIcon size={30} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Password changed successfully!</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Use your new password on your next sign-in.</p>
            <button className="btn btn-primary" style={{ padding: '11px 0', width: '100%' }} onClick={closeModal}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordField({ label, value, visible, onChange, onToggle, disabled }) {
  return (
    <div className="form-group">
      <label>{label} *</label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', paddingRight: 42 }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', padding: 4,
          }}
        >
          {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
        </button>
      </div>
    </div>
  );
}
