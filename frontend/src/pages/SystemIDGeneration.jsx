import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  getSystemIdCandidates,
  sendCareIdEmail,
  sendCareIdBulk,
  resetCareIdLockout,
} from '../api/endpoints';
import toast from 'react-hot-toast';
import { MailIcon, ChevronDownIcon, CheckIcon, XIcon, RefreshIcon, KeyIcon } from '../components/BrandIcons';

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
            className="btn btn-primary"
            onClick={() => setBulkOpen(!bulkOpen)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <MailIcon size={16} /> Bulk Email
            <ChevronDownIcon size={15} />
          </button>
          {bulkOpen && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 100,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(9,25,38,0.15)', minWidth: 240, overflow: 'hidden',
            }}>
              <button onClick={() => handleBulk('passed')} style={dropBtn('#eafaf1', '#166534', true)}>
                <CheckIcon size={14} /> Send All Passed (CARE ID)
              </button>
              <button onClick={() => handleBulk('failed')} style={dropBtn('#fdedec', '#991b1b', false)}>
                <XIcon size={14} /> Send All Failed (Rejection)
              </button>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CheckIcon size={13} style={{ color: '#166534' }} /> <strong>{passed.length}</strong> passed</span>
          <span style={{ color: 'var(--border)', fontWeight: 700 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><XIcon size={13} style={{ color: '#dc2626' }} /> <strong>{failed.length}</strong> failed</span>
        </div>
      </div>

      {/* ── Candidates Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.35, marginBottom: 12 }}><KeyIcon size={44} /></div>
            <p style={{ margin: 0 }}>No CARE IDs generated yet.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><KeyIcon size={18} /> CARE ID Candidates ({candidates.length})</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
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
                              background: 'rgba(201,162,75,0.14)', color: '#9C7B2E',
                              border: '1px solid rgba(201,162,75,0.4)',
                              padding: '3px 10px', borderRadius: 6,
                              fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 1,
                            }}>{c.care_id}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={td}>
                        <span className="badge" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: isPassed ? '#eafaf1' : '#fdedec',
                          color:      isPassed ? '#166534' : '#991b1b',
                        }}>
                          {isPassed ? <CheckIcon size={11} /> : <XIcon size={11} />}
                          {isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td style={{ ...td }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {isPassed && (
                            <>
                              <button
                                disabled={isSending}
                                onClick={() => handleSend(c.id, c.email)}
                                style={{
                                  background: c.care_id_email_sent ? 'var(--secondary)' : 'var(--brand-gold)',
                                  color: c.care_id_email_sent ? 'var(--text-muted)' : 'var(--brand-navy)',
                                  border: 'none', borderRadius: 6,
                                  padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  opacity: isSending ? 0.7 : 1,
                                }}
                              >
                                {isSending ? 'Sending…' : c.care_id_email_sent
                                  ? <><RefreshIcon size={12} /> Resend</>
                                  : <><MailIcon size={12} /> Send</>}
                              </button>
                              {c.is_locked_out && (
                                <button
                                  onClick={() => handleResetLockout(c.id, c.full_name)}
                                  style={{
                                    background: '#fdedec', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)',
                                    borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                                  }}
                                >
                                  <RefreshIcon size={12} /> Reset Lockout
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
  display: 'flex', width: '100%', alignItems: 'center', gap: 8,
  padding: '12px 16px', border: 'none', background: bg,
  color, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  borderBottom: '1px solid rgba(0,0,0,0.04)',
});
