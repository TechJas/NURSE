import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetPassword } from '../api/endpoints';
import toast from 'react-hot-toast';
import AuthLayout from '../layouts/AuthLayout';
import { EyeIcon, EyeOffIcon } from '../components/BrandIcons';

export default function SetNewPassword() {
  const { user, mustResetPassword, logout, clearMustReset } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ new_password: '', confirm_password: '' });
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState({ new: false, confirm: false });

  useEffect(() => {
    if (!mustResetPassword) {
      if (user?.admin_role === 'dept_head') navigate('/dept', { replace: true });
      else if (user?.admin_role === 'hospital_admin') navigate('/hospital-admin', { replace: true });
      else if (user?.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [mustResetPassword, user, navigate]);

  const submit = async () => {
    if (!f.new_password) return toast.error('New password is required');
    if (f.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    if (f.new_password !== f.confirm_password) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await resetPassword({ current_password: '', new_password: f.new_password });
      toast.success('Password set successfully!');
      clearMustReset();
      if (user?.admin_role === 'dept_head') navigate('/dept');
      else if (user?.admin_role === 'hospital_admin') navigate('/hospital-admin');
      else navigate('/admin');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to set password');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <AuthLayout headline="Your credentials. Your control.">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/carenium-logo.jpg" alt="Carenium" />
          <h1>CARE<em>NIUM</em></h1>
          <p>Set Your Permanent Password</p>
        </div>

        <div className="alert alert-warning">
          <span>🔒 This is your first login. You must set a permanent password before accessing the dashboard.</span>
        </div>

        <form onSubmit={e => { e.preventDefault(); submit(); }}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled style={{ background: '#f2f6f7' }} />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <div className="pw-field">
              <input
                type={showPw.new ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={f.new_password}
                onChange={e => setF(p => ({ ...p, new_password: e.target.value }))}
              />
              <button
                type="button"
                className="pw-toggle"
                title={showPw.new ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
              >
                {showPw.new ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm New Password *</label>
            <div className="pw-field">
              <input
                type={showPw.confirm ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={f.confirm_password}
                onChange={e => setF(p => ({ ...p, confirm_password: e.target.value }))}
              />
              <button
                type="button"
                className="pw-toggle"
                title={showPw.confirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
              >
                {showPw.confirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" /> Setting Password…</> : 'Set Password & Continue'}
          </button>
        </form>

        <hr className="auth-divider" />
        <p className="text-muted text-small" style={{ textAlign: 'center' }}>
          <button onClick={handleLogout} className="auth-link">
            Sign Out
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
