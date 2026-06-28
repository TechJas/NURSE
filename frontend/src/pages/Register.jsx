import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerNurse } from '../api/endpoints';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerNurse({ ...data, age: parseInt(data.age, 10) });
      toast.success('Registration submitted! Wait for admin approval to login.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        detail.forEach((e) => toast.error(e.msg || 'Validation error'));
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <h1>🏥 MediLogistics</h1>
          <p>Professional Nurse Registration</p>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          📋 After registration, an admin will review and approve your account before you can log in.
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input placeholder="Jane Doe" {...register('full_name', { required: 'Required' })} />
              {errors.full_name && <span className="error-msg">{errors.full_name.message}</span>}
            </div>
            <div className="form-group">
              <label>Age *</label>
              <input type="number" min="21" placeholder="21+" {...register('age', { required: 'Required', min: { value: 21, message: 'Minimum age is 21' } })} />
              {errors.age && <span className="error-msg">{errors.age.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input type="email" placeholder="your@email.com" {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
            {errors.email && <span className="error-msg">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label>Phone *</label>
            <input placeholder="+91 9876543210" {...register('phone', { required: 'Required' })} />
            {errors.phone && <span className="error-msg">{errors.phone.message}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>License Number *</label>
              <input placeholder="NMC-123456" {...register('registration_number', { required: 'Required' })} />
              {errors.registration_number && <span className="error-msg">{errors.registration_number.message}</span>}
            </div>
            <div className="form-group">
              <label>Specialization</label>
              <select {...register('specialization')}>
                <option value="">Select</option>
                <option>ICU</option>
                <option>Home Care</option>
                <option>Pediatrics</option>
                <option>General</option>
                <option>Emergency</option>
                <option>Oncology</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input type="password" placeholder="Min. 8 characters" {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
            {errors.password && <span className="error-msg">{errors.password.message}</span>}
          </div>

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Submitting…</> : 'Submit Registration'}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-muted text-small" style={{ textAlign: 'center' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
