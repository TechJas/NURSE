import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  listNurses, verifyNurse, rejectNurse, getNurseDocuments,
  getInterviewSessions, assignNursesToInterview, exportNursesCSV,
  requestReupload, getDocumentSignedUrl,
} from '../api/endpoints';
import toast from 'react-hot-toast';

const FILTERS = ['All', 'KYC Pending', 'KYC Approved', 'Interview Scheduled', 'Interview Passed', 'Active'];

const DOC_TYPE_LABELS = {
  nursing_degree:    'Nursing Degree',
  national_id:       'National ID / Aadhaar',
  registration_cert: 'Registration Certificate',
  experience_letter: 'Experience Letter',
  nursing_license:   'Nursing License',
};

const APPROVAL_REASONS = [
  'All documents verified and genuine',
  'Documents verified — minor issues noted but acceptable',
];

function filterNurses(nurses, filter) {
  switch (filter) {
    case 'KYC Pending':         return nurses.filter(n => !n.is_verified);
    case 'KYC Approved':        return nurses.filter(n =>  n.is_verified);
    case 'Interview Scheduled': return nurses.filter(n => n.interview_status === 'SCHEDULED');
    case 'Interview Passed':    return nurses.filter(n => ['PASSED', 'SELECTED'].includes(n.interview_status));
    case 'Active':              return nurses.filter(n => n.shift_unlocked);
    default:                    return nurses;
  }
}

function StatusBadge({ verified, interviewStatus }) {
  if (!verified) return <span className="badge badge-pending">KYC Pending</span>;
  const map = {
    SCHEDULED: { cls: 'badge-active',   label: 'Interview Scheduled' },
    SELECTED:  { cls: 'badge-approved', label: 'Selected' },
    PASSED:    { cls: 'badge-approved', label: 'Passed' },
    REJECTED:  { cls: 'badge-failed',   label: 'Rejected' },
  };
  const s = map[interviewStatus] || { cls: 'badge-approved', label: 'KYC Approved' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default function NurseRegistry() {
  const [nurses,   setNurses]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState(new Set());

  // KYC detail modal
  const [detailNurse,     setDetailNurse]     = useState(null);
  const [docs,            setDocs]            = useState([]);
  const [docsLoading,     setDocsLoading]     = useState(false);

  // Reject
  const [rejectReason,    setRejectReason]    = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Approve confirmation panel
  const [showApprovePanel, setShowApprovePanel] = useState(false);
  const [approvalReason,   setApprovalReason]   = useState('');

  // Track which documents the admin has viewed
  const [viewedDocs,   setViewedDocs]   = useState(new Set());
  const [viewingDocId, setViewingDocId] = useState(null); // loading state for View File btn

  // Reupload per-doc state
  const [reuploadDoc,     setReuploadDoc]     = useState(null);
  const [reuploadReason,  setReuploadReason]  = useState('');
  const [reuploadSending, setReuploadSending] = useState(false);

  // Assign to interview modal
  const [sessions,        setSessions]        = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSessionId, setAssignSessionId] = useState('');

  const fetchNurses = async () => {
    try { const r = await listNurses(); setNurses(r.data); }
    catch { toast.error('Failed to load nurses.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNurses(); }, []);

  const filtered = filterNurses(nurses, filter);

  // --- Derived state for approval guard ---
  const hasDocuments       = docs.length > 0;
  const allDocsViewed      = hasDocuments && docs.every(d => viewedDocs.has(d.id));
  const canApprove         = hasDocuments && allDocsViewed;
  const docsNotViewedCount = hasDocuments ? docs.filter(d => !viewedDocs.has(d.id)).length : 0;

  const openDetail = async (nurse) => {
    setDetailNurse(nurse);
    setShowRejectInput(false);
    setShowApprovePanel(false);
    setRejectReason('');
    setApprovalReason('');
    setViewedDocs(new Set());
    setReuploadDoc(null);
    setReuploadReason('');
    setDocs([]);
    setDocsLoading(true);
    try { const r = await getNurseDocuments(nurse.id); setDocs(r.data); }
    catch { setDocs([]); }
    finally { setDocsLoading(false); }
  };

  const handleViewDoc = async (doc) => {
    if (viewingDocId === doc.id) return; // already loading this one
    setViewingDocId(doc.id);
    try {
      // Call the secure backend endpoint to get a Supabase signed URL
      const res = await getDocumentSignedUrl(detailNurse.id, doc.id);
      const signedUrl = res.data?.signed_url;
      if (!signedUrl) {
        toast.error('Could not generate a secure link for this document.');
        return;
      }
      // Mark this document as viewed
      setViewedDocs(prev => new Set([...prev, doc.id]));
      // Open the real signed URL in a new tab
      window.open(signedUrl, '_blank');
    } catch (e) {
      const detail = e.response?.data?.detail;
      toast.error(detail || 'Failed to open document. Please try again.');
    } finally {
      setViewingDocId(null);
    }
  };

  const handleApproveClick = () => {
    if (!hasDocuments) {
      toast.error('Cannot approve: Nurse has not uploaded any documents.');
      return;
    }
    if (!allDocsViewed) {
      toast.error(`You must view all documents before approving. ${docsNotViewedCount} document(s) remaining.`);
      return;
    }
    setShowApprovePanel(true);
    setShowRejectInput(false);
  };

  const handleConfirmApproval = async () => {
    if (!approvalReason) return toast.error('Please select an approval reason.');
    try {
      await verifyNurse(detailNurse.id);
      toast.success('KYC Approved ✅');
      fetchNurses();
      setDetailNurse(null);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to approve.'); }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return toast.error('Enter a rejection reason.');
    try {
      await rejectNurse(id, { reason: rejectReason });
      toast.success('KYC Rejected.');
      fetchNurses();
      setDetailNurse(null);
      setRejectReason('');
      setShowRejectInput(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleRequestReupload = async () => {
    if (!reuploadReason.trim()) return toast.error('Please enter a reason for re-upload.');
    setReuploadSending(true);
    try {
      await requestReupload(detailNurse.id, {
        document_type: reuploadDoc,
        reason:        reuploadReason,
      });
      toast.success(`Re-upload requested for "${DOC_TYPE_LABELS[reuploadDoc] || reuploadDoc}". Nurse will be notified.`);
      setReuploadDoc(null);
      setReuploadReason('');
      const r = await getNurseDocuments(detailNurse.id);
      setDocs(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to request re-upload.');
    } finally {
      setReuploadSending(false);
    }
  };

  const handleExport = async () => {
    const map = { 'All': 'all', 'KYC Approved': 'kyc_approved', 'KYC Pending': 'kyc_pending', 'Interview Scheduled': 'interview_scheduled', 'Interview Passed': 'interview_passed', 'Active': 'active' };
    try {
      const res = await exportNursesCSV(map[filter] || 'all');
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `nurses_${map[filter] || 'all'}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed.'); }
  };

  const openAssign = async () => {
    if (selected.size === 0) return toast.error('Select nurses first.');
    try { const r = await getInterviewSessions(); setSessions(r.data); setShowAssignModal(true); }
    catch { toast.error('Failed to load sessions.'); }
  };

  const handleAssign = async () => {
    if (!assignSessionId) return toast.error('Select a session.');
    try {
      await assignNursesToInterview({ session_id: assignSessionId, nurse_ids: [...selected] });
      toast.success(`${selected.size} nurses assigned!`);
      setSelected(new Set()); setShowAssignModal(false); fetchNurses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const toggleSelect = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll   = ()    => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(n => n.id))); };

  return (
    <AppLayout title="Nurse Registry">

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filter} onChange={e => { setFilter(e.target.value); setSelected(new Set()); }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
            {FILTERS.map(f => <option key={f}>{f}</option>)}
          </select>
          <button className="btn btn-outline" onClick={handleExport} style={{ fontSize: 12 }}>📥 Download CSV</button>
          {selected.size > 0 && (
            <button className="btn btn-primary" onClick={openAssign} style={{ fontSize: 12 }}>
              📍 Assign {selected.size} to Interview
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {filtered.length} nurse{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Nurse Table */}
      <div className="card">
        <div className="card-header"><h2>Nurses ({filtered.length})</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                    <th>Name</th><th>Email</th><th>Specialization</th><th>KYC Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No nurses found.</td></tr>
                  )}
                  {filtered.map(n => (
                    <tr key={n.id}>
                      <td><input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} /></td>
                      <td><strong>{n.full_name}</strong></td>
                      <td style={{ fontSize: 13 }}>{n.email}</td>
                      <td>{n.specialization || '—'}</td>
                      <td><StatusBadge verified={n.is_verified} interviewStatus={n.interview_status} /></td>
                      <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openDetail(n)}>
                          👁 View
                        </button>
                        {!n.is_verified && (
                          <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11, background: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => openDetail(n)}>
                            📋 Review KYC
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── KYC Review Modal ── */}
      {detailNurse && (
        <div style={overlay} onClick={() => setDetailNurse(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{detailNurse.full_name}</h2>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detailNurse.email}</span>
              </div>
              <button onClick={() => setDetailNurse(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* KYC Status Banner */}
            <div style={{
              padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 600,
              background: detailNurse.is_verified ? '#EAFAF1' : '#FEF3C7',
              color: detailNurse.is_verified ? '#166534' : '#92400e',
              border: `1px solid ${detailNurse.is_verified ? '#86efac' : '#fcd34d'}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {detailNurse.is_verified ? '✅ KYC Verified — This nurse is approved.' : '⏳ KYC Pending — Review documents below before approving.'}
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22, fontSize: 13 }}>
              <div><strong>Phone:</strong> {detailNurse.phone || '—'}</div>
              <div><strong>Age:</strong> {detailNurse.age || '—'}</div>
              <div><strong>Reg No:</strong> {detailNurse.registration_number || '—'}</div>
              <div><strong>Specialization:</strong> {detailNurse.specialization || '—'}</div>
              <div><strong>Interview:</strong> {detailNurse.interview_status || 'NOT SCHEDULED'}</div>
              <div><strong>Shift Active:</strong> {detailNurse.shift_unlocked ? '✅ Yes' : '❌ No'}</div>
            </div>

            {/* ── Documents Section ── */}
            <h3 style={{ marginBottom: 10, fontSize: 15, color: '#374151' }}>📁 Uploaded Documents</h3>

            {docsLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading documents…</div>
            ) : docs.length === 0 ? (
              <div style={{ padding: '18px 20px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
                ⚠️ No documents uploaded yet. The nurse must upload their documents before KYC can be approved.
              </div>
            ) : (
              <>
                {/* View progress indicator */}
                <div style={{
                  padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600,
                  background: allDocsViewed ? '#EAFAF1' : '#EFF6FF',
                  color: allDocsViewed ? '#166534' : '#1e40af',
                  border: `1px solid ${allDocsViewed ? '#86efac' : '#93c5fd'}`,
                }}>
                  {allDocsViewed
                    ? `✅ All ${docs.length} document(s) viewed — you may now approve.`
                    : `📋 ${viewedDocs.size} of ${docs.length} document(s) viewed. View all to enable approval.`
                  }
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {docs.map((d, i) => {
                    const docLabel  = DOC_TYPE_LABELS[d.document_type] || d.document_type || `Document ${i + 1}`;
                    const isViewed  = viewedDocs.has(d.id);   // track by doc.id
                    const isLoading = viewingDocId === d.id;  // this doc is currently loading
                    const isFlagged = d.reupload_requested;
                    const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date();
                    const isRequestingThisDoc = reuploadDoc === d.document_type;

                    return (
                      <div key={i} style={{
                        background: isFlagged ? '#fff7ed' : isViewed ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${isFlagged ? '#fed7aa' : isViewed ? '#bbf7d0' : 'var(--border)'}`,
                        borderRadius: 8, padding: '10px 14px',
                      }}>
                        {/* Document row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📄 {docLabel}</span>
                            {isViewed && (
                              <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                ✓ VIEWED
                              </span>
                            )}
                            {d.expiry_date && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: isExpired ? '#dc2626' : '#6b7280' }}>
                                {isExpired ? '⚠️ EXPIRED' : '📅 Expires'}: {d.expiry_date}
                              </span>
                            )}
                            {isFlagged && (
                              <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>
                                🔄 Re-upload Requested
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => handleViewDoc(d)}
                              disabled={isLoading}
                              className="btn btn-outline"
                              style={{
                                padding: '4px 10px', fontSize: 11,
                                background: isViewed ? '#dcfce7' : undefined,
                                borderColor: isViewed ? '#86efac' : undefined,
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'wait' : 'pointer',
                              }}
                            >
                              {isLoading ? '⏳ Opening…' : isViewed ? '👁 Viewed' : '👁 View File'}
                            </button>
                            {/* Request reupload button — only for non-flagged docs */}
                            {!isFlagged && (
                              <button
                                onClick={() => { setReuploadDoc(isRequestingThisDoc ? null : d.document_type); setReuploadReason(''); }}
                                style={{
                                  padding: '4px 10px', fontSize: 11, border: '1px solid #f59e0b',
                                  background: isRequestingThisDoc ? '#fef3c7' : '#fff',
                                  color: '#92400e', borderRadius: 6, cursor: 'pointer',
                                }}
                              >
                                🔄 Reupload
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline reupload reason box */}
                        {isRequestingThisDoc && (
                          <div style={{ marginTop: 10, borderTop: '1px solid #fed7aa', paddingTop: 10 }}>
                            <textarea
                              placeholder={`Reason for requesting re-upload of "${docLabel}"…`}
                              value={reuploadReason}
                              onChange={e => setReuploadReason(e.target.value)}
                              rows={2}
                              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #fca5a5', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button
                                disabled={reuploadSending}
                                onClick={handleRequestReupload}
                                style={{ flex: 1, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                              >
                                {reuploadSending ? 'Sending…' : '📨 Send Request'}
                              </button>
                              <button
                                onClick={() => { setReuploadDoc(null); setReuploadReason(''); }}
                                style={{ padding: '7px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── KYC Action Buttons — only show if not yet verified ── */}
            {!detailNurse.is_verified && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                  Review the documents above, then approve or reject this nurse's KYC.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {/* ── APPROVE BUTTON (guarded) ── */}
                  <button
                    className="btn btn-success"
                    style={{
                      flex: 1,
                      opacity: canApprove ? 1 : 0.45,
                      cursor: canApprove ? 'pointer' : 'not-allowed',
                    }}
                    onClick={handleApproveClick}
                    title={
                      !hasDocuments
                        ? 'Nurse must upload documents first'
                        : !allDocsViewed
                        ? `View all ${docsNotViewedCount} remaining document(s) to enable approval`
                        : 'Approve KYC'
                    }
                  >
                    ✅ Approve KYC
                  </button>

                  {/* ── REJECT BUTTON ── */}
                  <button
                    className="btn"
                    style={{ flex: 1, background: '#ef4444', color: '#fff' }}
                    onClick={() => { setShowRejectInput(v => !v); setShowApprovePanel(false); }}
                  >
                    ❌ Reject KYC
                  </button>
                </div>

                {/* ── APPROVE CONFIRMATION PANEL ── */}
                {showApprovePanel && (
                  <div style={{
                    marginTop: 14, padding: 16, borderRadius: 10,
                    background: '#f0fdf4', border: '1px solid #86efac',
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 12, marginTop: 0 }}>
                      Select approval reason:
                    </p>
                    {APPROVAL_REASONS.map((reason, idx) => (
                      <label key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                        background: approvalReason === reason ? '#dcfce7' : '#fff',
                        border: `1px solid ${approvalReason === reason ? '#22c55e' : '#e5e7eb'}`,
                        marginBottom: 6,
                        transition: 'all 0.15s ease',
                      }}>
                        <input
                          type="radio"
                          name="approval_reason"
                          value={reason}
                          checked={approvalReason === reason}
                          onChange={() => setApprovalReason(reason)}
                          style={{ accentColor: '#22c55e' }}
                        />
                        {reason}
                      </label>
                    ))}
                    <button
                      className="btn btn-success"
                      style={{ width: '100%', marginTop: 10, opacity: approvalReason ? 1 : 0.5 }}
                      disabled={!approvalReason}
                      onClick={handleConfirmApproval}
                    >
                      ✅ Confirm Approval
                    </button>
                  </div>
                )}

                {/* ── REJECT INPUT PANEL ── */}
                {showRejectInput && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      placeholder="Enter rejection reason (required)…"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #fca5a5', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                    />
                    <button className="btn" style={{ background: '#ef4444', color: '#fff', marginTop: 8, width: '100%' }}
                      onClick={() => handleReject(detailNurse.id)}>
                      Submit Rejection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assign to Interview Modal ── */}
      {showAssignModal && (
        <div style={overlay} onClick={() => setShowAssignModal(false)}>
          <div style={{ ...modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Assign {selected.size} Nurses to Interview</h2>
            <div className="form-group">
              <label>Select Interview Session</label>
              <select value={assignSessionId} onChange={e => setAssignSessionId(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                <option value="">Choose session…</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.venue_name} — {s.interview_date} {s.interview_time}</option>)}
              </select>
            </div>
            {sessions.length === 0 && (
              <p style={{ fontSize: 13, color: '#ef4444' }}>No sessions available. Go to Interviews and create one first.</p>
            )}
            <button className="btn btn-primary btn-full" onClick={handleAssign}>Assign to Interview</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modal   = { background: '#fff', borderRadius: 14, padding: 28, maxWidth: 560, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' };
