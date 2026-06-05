import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetPassword } from '../api/endpoints';
import toast from 'react-hot-toast';

export default function SetNewPassword() {
  const { user, mustResetPassword, logout, clearMustReset } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ new_password: '', confirm_password: '' });
  const [busy, setBusy] = useState(false);

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
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>🏥 Carenium</h1>
          <p>Set Your Permanent Password</p>
        </div>

        <div className="alert alert-warning">
          <span>🔒 This is your first login. You must set a permanent password before accessing the dashboard.</span>
        </div>

        <form onSubmit={e => { e.preventDefault(); submit(); }}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled style={{ background: '#f9fafb' }} />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <input type="password" placeholder="Min. 6 characters"
              value={f.new_password} onChange={e => setF(p => ({ ...p, new_password: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Confirm New Password *</label>
            <input type="password" placeholder="Re-enter new password"
              value={f.confirm_password} onChange={e => setF(p => ({ ...p, confirm_password: e.target.value }))} />
          </div>

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" /> Setting Password…</> : '🔑 Set Password & Continue'}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-muted text-small" style={{ textAlign: 'center' }}>
          <button onClick={handleLogout}
            style={{ background:'none', border:'none', color:'var(--primary-light)', fontWeight:600, cursor:'pointer', fontSize:'inherit' }}>
            Sign Out
          </button>
        </p>
      </div>
    </div>
  );
}
