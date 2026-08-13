import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/endpoints';
import toast from 'react-hot-toast';
import AuthLayout from '../layouts/AuthLayout';
import { EyeIcon, EyeOffIcon, LockIcon } from '../components/BrandIcons';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await loginUser(data);
      const { access_token, must_reset_password } = res.data;
      const userData = login(access_token, must_reset_password);
      toast.success('Login successful!');
      if (must_reset_password) {
        navigate('/set-password');
      } else if (userData.role === 'admin') {
        if (userData.admin_role === 'dept_head') navigate('/dept');
        else if (userData.admin_role === 'hospital_admin') navigate('/hospital-admin');
        else navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === 'Nurse not approved') {
        toast.error('Your account is not approved yet. Please wait for admin verification.');
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        detail.forEach(e => toast.error(e.msg || 'Invalid input'));
      } else {
        toast.error('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout headline="Care that moves with technology.">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/carenium-logo.jpg" alt="Carenium" />
          <h1>CARE<em>NIUM</em></h1>
          <p>Nurse Platform — Secure Sign In</p>
        </div>

        <div className="auth-lock-note">
          <LockIcon size={15} />
          <span>Your session is protected and expires after 60 minutes of inactivity.</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="nurse@hospital.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <span className="error-msg">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="pw-field">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                className="pw-toggle"
                title={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <span className="error-msg">{errors.password.message}</span>}
          </div>

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing In…</> : 'Sign In'}
          </button>
        </form>

        <hr className="auth-divider" />
        <p className="text-muted text-small" style={{ textAlign: 'center' }}>
          Not registered?{' '}
          <Link to="/register" className="auth-link">
            Create Account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
