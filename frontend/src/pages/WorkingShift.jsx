import { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { getNurseProfile, unlockWorkingShift, getShiftInfo } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LockIcon, AlertIcon } from '../components/BrandIcons';

export default function WorkingShift() {
  const { updateAccessLevel } = useAuth();
  const [loading,   setLoading]   = useState(true);
  const [profile,   setProfile]   = useState(null);
  const [, setShiftData] = useState(null);
  const [key,       setKey]       = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const loadProfile = () =>
    getNurseProfile()
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Could not load profile.'));

  const loadShiftInfo = () =>
    getShiftInfo()
      .then(r => setShiftData(r.data))
      .catch(() => {});

  useEffect(() => {
    Promise.all([loadProfile(), loadShiftInfo()]).finally(() => setLoading(false));
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!key.trim()) return toast.error('Please enter your CARE ID.');
    setUnlocking(true);
    try {
      await unlockWorkingShift({ key: key.trim() });
      toast.success('Access activated! Welcome to Carenium.');
      updateAccessLevel('full');
      await loadShiftInfo();
      setProfile(prev => ({ ...prev, care_id_verified: true, shift_unlocked: true }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid CARE ID.');
      loadProfile();
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Working Shift">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      </AppLayout>
    );
  }

  // ── FULLY ACTIVATED — redirect to dashboard ────────────────────────────
  if (profile?.care_id_verified || profile?.shift_unlocked) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── LOCKED OUT ────────────────────────────────────────────────────────────
  if (profile?.is_locked_out) {
    return (
      <AppLayout title="Working Shift">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: 20 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <div className="card-body" style={{ padding: '48px 36px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px', background: 'rgba(220,38,38,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LockIcon size={30} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10, color: '#991b1b' }}>
                Account Temporarily Locked
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                You have entered the wrong CARE ID <strong>3 times</strong>.
              </p>
              <div style={{
                marginTop: 18, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)',
                borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}>
                <AlertIcon size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>
                  Please check the CARE ID in your registered email and try again after <strong>24 hours</strong>.
                  Contact the admin to reset your lockout.
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── CARE ID ENTRY ─────────────────────────────────────────────────────────
  const attemptsUsed = profile?.care_id_attempts || 0;
  const attemptsLeft = Math.max(0, 3 - attemptsUsed);

  return (
    <AppLayout title="Working Shift">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: 20 }}>
        <div className="card" style={{ maxWidth: 460, width: '100%' }}>
          <div className="card-body" style={{ padding: '48px 36px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', margin: '0 auto 18px', background: 'rgba(18,151,169,0.12)', color: '#0B5E6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon size={30} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 6 }}>
              This Section is Locked
            </h2>

            {!profile?.care_id_assigned ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginTop: 12 }}>
                Your CARE ID will be emailed once you are selected after your interview.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 22 }}>
                  Enter the CARE ID received in your registered email to unlock full access.
                </p>

                <form onSubmit={handleUnlock}>
                  <div style={{ marginBottom: 16 }}>
                    <input
                      type="text" placeholder="CARE-2026-XXXX"
                      value={key} onChange={e => setKey(e.target.value.toUpperCase())}
                      style={{
                        textAlign: 'center', fontSize: 20, width: '100%', boxSizing: 'border-box',
                        fontFamily: "'Courier New', monospace", letterSpacing: 3, padding: '14px 16px',
                        border: '1.5px solid var(--border)', borderRadius: 12, outline: 'none',
                        transition: 'all 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(18,151,169,0.16)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                    {[0, 1, 2].map(i => {
                      const used = i < attemptsUsed;
                      const isRed = used && attemptsUsed >= 2;
                      return (
                        <div key={i} style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: used ? (isRed ? '#dc2626' : 'var(--brand-gold)') : 'var(--border)',
                          boxShadow: used ? `0 0 8px ${isRed ? 'rgba(220,38,38,0.5)' : 'rgba(201,162,75,0.5)'}` : 'none',
                        }} />
                      );
                    })}
                  </div>

                  {attemptsUsed > 0 && (
                    <div style={{
                      background: 'rgba(201,162,75,0.12)', border: '1px solid rgba(201,162,75,0.4)', borderRadius: 10,
                      padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e',
                    }}>
                      {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before 24-hour lockout
                    </div>
                  )}

                  <button className="btn btn-primary btn-full" type="submit" disabled={unlocking}>
                    {unlocking ? <><span className="spinner" /> Verifying…</> : 'Unlock Full Access'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
