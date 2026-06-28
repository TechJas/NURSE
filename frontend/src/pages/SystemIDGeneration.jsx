import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  getSystemIdCandidates,
  sendCareIdEmail,
  sendCareIdBulk,
  resetCareIdLockout,
} from '../api/endpoints';
import toast from 'react-hot-toast';

export default function SystemIDGeneration() {
  const [candidates, setCandidates]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [bulkOpen, setBulkOpen]         = useState(false);
  const [sending, setSending]           = useState({});

  const load = async () => {
    try {
      const res = await getSystemIdCandidates();
      setCandidates(res.data);
    } catch {
      toast.error('Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Individual Send ── */
  const handleSend = async (nurseId, email) => {
    setSending((p) => ({ ...p, [nurseId]: true }));
    try {
      await sendCareIdEmail(nurseId);
      toast.success(`CARE ID sent to ${email}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Send failed.');
    } finally {
      setSending((p) => ({ ...p, [nurseId]: false }));
    }
  };

  /* ── Bulk Send ── */
  const handleBulk = async (target) => {
    setBulkOpen(false);
    const label = target === 'passed' ? 'Passed' : 'Failed';
    try {
      const res = await sendCareIdBulk({ target });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || `Bulk send to ${label} failed.`);
    }
  };

  /* ── Reset Lockout ── */
  const handleResetLockout = async (nurseId, name) => {
    try {
      await resetCareIdLockout(nurseId);
      toast.success(`Lockout cleared for ${name}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed.');
    }
  };

  const passed = candidates.filter(c => ['PASSED', 'SELECTED'].includes(c.interview_status));
  const failed = candidates.filter(c => ['FAILED', 'REJECTED'].includes(c.interview_status));

  return (
    <AppLayout title="System ID Generation">
      {/* ── Top Action Bar ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>

        {/* Bulk Email dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setBulkOpen(!bulkOpen)}
            style={{
              background: '#7c3aed', color: '#fff', border: 'none',
              padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            📧 Bulk Email ▾
          </button>
          {bulkOpen && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 100,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 220, overflow: 'hidden',
            }}>
              <button onClick={() => handleBulk('passed')} style={dropBtn('#dcfce7', '#166534')}>
                ✅ Send All Passed (CARE ID)
              </button>
              <button onClick={() => handleBulk('failed')} style={dropBtn('#fee2e2', '#991b1b')}>
                ❌ Send All Failed (Rejection)
              </button>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {passed.length} passed · {failed.length} failed
        </div>
      </div>

      {/* ── Candidates Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p>No CARE IDs generated yet.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Name', 'Email', 'Contact', 'CARE ID', 'Status', 'Action'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => {
                  const isPassed  = ['PASSED', 'SELECTED'].includes(c.interview_status);
                  const isSending = sending[c.id];

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}>
                        <strong style={{ fontSize: 14 }}>{c.full_name}</strong>
                      </td>
                      <td style={{ ...td, fontSize: 13, color: 'var(--text-muted)' }}>{c.email}</td>
                      <td style={{ ...td, fontSize: 13 }}>{c.phone || '—'}</td>
                      <td style={td}>
                        {c.care_id
                          ? <span style={{
                              background: '#1e3a5f', color: '#fff',
                              padding: '3px 10px', borderRadius: 6,
                              fontFamily: 'monospace', fontSize: 13, letterSpacing: 1,
                            }}>{c.care_id}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={td}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: isPassed ? '#dcfce7' : '#fee2e2',
                          color:      isPassed ? '#166534' : '#991b1b',
                        }}>
                          {isPassed ? '✅ PASSED' : '❌ FAILED'}
                        </span>
                      </td>
                      <td style={{ ...td, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {isPassed && (
                          <>
                            <button
                              disabled={isSending}
                              onClick={() => handleSend(c.id, c.email)}
                              style={{
                                background: c.care_id_email_sent ? '#6b7280' : '#1e3a5f',
                                color: '#fff', border: 'none', borderRadius: 6,
                                padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                                opacity: isSending ? 0.7 : 1,
                              }}
                            >
                              {isSending ? '…' : c.care_id_email_sent ? '🔄 Resend' : '📧 Send'}
                            </button>
                            {c.is_locked_out && (
                              <button
                                onClick={() => handleResetLockout(c.id, c.full_name)}
                                style={{
                                  background: '#dc2626', color: '#fff', border: 'none',
                                  borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                                }}
                              >
                                🔓 Reset Lockout
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close bulk dropdown on outside click */}
      {bulkOpen && (
        <div
          onClick={() => setBulkOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
        />
      )}
    </AppLayout>
  );
}

const th = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};
const td = { padding: '12px 14px', verticalAlign: 'middle' };
const dropBtn = (bg, color) => ({
  display: 'block', width: '100%', textAlign: 'left',
  padding: '12px 16px', border: 'none', background: bg,
  color, cursor: 'pointer', fontSize: 13, fontWeight: 600,
});
