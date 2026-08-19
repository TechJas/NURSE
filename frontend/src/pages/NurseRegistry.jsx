import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  listNurses, verifyNurse, rejectNurse, getNurseDocuments,
  getInterviewSessions, assignNursesToInterview, exportNursesCSV,
  requestReupload, getDocumentSignedUrl,
} from '../api/endpoints';
import toast from 'react-hot-toast';
import { NurseIcon, EyeIcon, CheckIcon, RefreshIcon, XIcon, AlertIcon, DownloadIcon, DocumentsIcon, ClockIcon, CalendarIcon } from '../components/BrandIcons';

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

  // KYC detail drawer
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
  const [assignBusy,      setAssignBusy]      = useState(false);

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
      toast.success('KYC Approved!');
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

  const parseSessionDT = (date, time) => {
    if (!time) return new Date(`${date}T00:00:00`);
    const m = time.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!m) return new Date(`${date}T00:00:00`);
    let h = parseInt(m[1], 10) % 12;
    if (m[3] === 'PM') h += 12;
    return new Date(`${date}T${String(h).padStart(2, '0')}:${m[2]}:00`);
  };

  const openAssign = async () => {
    if (selected.size === 0) return toast.error('Select nurses first.');
    try {
      const r = await getInterviewSessions(true);
      const now = new Date();
      const future = r.data.filter(s => parseSessionDT(s.interview_date, s.interview_time) > now);
      setSessions(future);
      setShowAssignModal(true);
    }
    catch { toast.error('Failed to load sessions.'); }
  };

  const handleAssign = async () => {
    if (!assignSessionId) return toast.error('Select a session.');
    if (assignBusy) return;
    setAssignBusy(true);
    try {
      const res = await assignNursesToInterview({ session_id: assignSessionId, nurse_ids: [...selected] });
      const count = res.data?.assigned?.length ?? selected.size;
      if (count === 0) return toast.error('No nurses could be assigned. Check the nurse selection.');
      toast.success(`${count} nurse${count !== 1 ? 's' : ''} assigned successfully!`);
      setSelected(new Set()); setShowAssignModal(false); fetchNurses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Assignment failed. Please try again.'); }
    finally { setAssignBusy(false); }
  };

  const toggleSelect = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll   = ()    => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(n => n.id))); };

  return (
    <AppLayout title="Nurse Registry">

      {/* ── Toolbar ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => { setFilter(f); setSelected(new Set()); }}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: '1px solid var(--border)', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === f ? 'var(--brand-cyan)' : '#fff',
                  color: filter === f ? '#fff' : 'var(--text)',
                  boxShadow: filter === f ? '0 4px 12px rgba(18,151,169,0.3)' : 'none',
                }}>{f}</button>
            ))}
          </div>
          <button className="btn btn-outline" onClick={handleExport} style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <DownloadIcon size={14} /> Download CSV
          </button>
          {selected.size > 0 && (
            <button className="btn btn-primary" onClick={openAssign} style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={14} /> Assign {selected.size} to Interview
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {filtered.length} nurse{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Nurse Table ── */}
      <div className="card">
        <div className="card-header"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><NurseIcon size={18} /> Nurses ({filtered.length})</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" style={cb}
                        checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                    </th>
                    <th>Name</th><th>Email</th><th>Specialization</th><th>KYC Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No nurses found.</td></tr>
                  )}
                  {filtered.map(n => (
                    <tr key={n.id}>
                      <td><input type="checkbox" style={cb} checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} /></td>
                      <td><strong>{n.full_name}</strong></td>
                      <td style={{ fontSize: 13 }}>{n.email}</td>
                      <td>{n.specialization || '—'}</td>
                      <td><StatusBadge verified={n.is_verified} interviewStatus={n.interview_status} /></td>
                      <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={() => openDetail(n)}>
                          <EyeIcon size={13} /> View
                        </button>
                        {!n.is_verified && (
                          <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            onClick={() => openDetail(n)}>
                            <RefreshIcon size={13} /> Review KYC
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

      {/* ── KYC Review Drawer ── */}
      {detailNurse && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,43,61,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setDetailNurse(null)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(520px, 100%)',
            background: '#fff', boxShadow: '-8px 0 32px rgba(9,25,38,0.18)',
            display: 'flex', flexDirection: 'column', animation: 'slideIn .28s cubic-bezier(0.22,1,0.36,1)',
          }} onClick={e => e.stopPropagation()}>

            {/* Navy header */}
            <div style={{ background: 'linear-gradient(120deg, #142B3D, #0B5E6B)', padding: '22px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700 }}>{detailNurse.full_name}</div>
                <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 3 }}>{detailNurse.email}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11.5, opacity: 0.75 }}>
                  <span>{detailNurse.specialization || '—'}</span>
                  <span>·</span>
                  <span>{detailNurse.phone || 'No phone'}</span>
                </div>
              </div>
              <button onClick={() => setDetailNurse(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: 6, display: 'flex' }}>
                <XIcon size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* KYC Status Banner */}
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 18, fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                background: detailNurse.is_verified ? 'rgba(30,132,73,0.1)' : 'rgba(201,162,75,0.12)',
                color: detailNurse.is_verified ? '#166534' : '#9C7B2E',
                border: `1px solid ${detailNurse.is_verified ? 'rgba(30,132,73,0.3)' : 'rgba(201,162,75,0.4)'}`,
              }}>
                {detailNurse.is_verified ? <CheckIcon size={15} /> : <ClockIcon size={15} />}
                {detailNurse.is_verified ? 'KYC Verified — This nurse is approved.' : 'KYC Pending — Review documents below before approving.'}
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 22, fontSize: 13 }}>
                <div style={infoRow}><strong style={infoLbl}>Age</strong> {detailNurse.age || '—'}</div>
                <div style={infoRow}><strong style={infoLbl}>Reg No</strong> {detailNurse.registration_number || '—'}</div>
                <div style={infoRow}><strong style={infoLbl}>Interview</strong> {detailNurse.interview_status || 'NOT SCHEDULED'}</div>
                <div style={infoRow}><strong style={infoLbl}>Shift Active</strong> {detailNurse.shift_unlocked ? 'Yes' : 'No'}</div>
              </div>

              {/* ── Documents Section ── */}
              <h3 style={{ marginBottom: 10, fontSize: 15, color: '#142B3D', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <DocumentsIcon size={16} /> Uploaded Documents
              </h3>

              {docsLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading documents…</div>
              ) : docs.length === 0 ? (
                <div style={{ padding: '18px 20px', background: 'rgba(220,38,38,0.07)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.3)', color: '#b91c1c', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertIcon size={15} /> No documents uploaded yet. The nurse must upload their documents before KYC can be approved.
                </div>
              ) : (
                <>
                  {/* View progress */}
                  <div style={{
                    padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: allDocsViewed ? 'rgba(30,132,73,0.1)' : 'rgba(18,151,169,0.08)',
                    color: allDocsViewed ? '#166534' : '#0B5E6B',
                    border: `1px solid ${allDocsViewed ? 'rgba(30,132,73,0.3)' : 'rgba(18,151,169,0.3)'}`,
                  }}>
                    {allDocsViewed
                      ? <><CheckIcon size={14} /> All {docs.length} document(s) viewed — you may now approve.</>
                      : <><EyeIcon size={14} /> {viewedDocs.size} of {docs.length} document(s) viewed. View all to enable approval.</>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {docs.map((d, i) => {
                      const docLabel  = DOC_TYPE_LABELS[d.document_type] || d.document_type || `Document ${i + 1}`;
                      const isViewed  = viewedDocs.has(d.id);
                      const isLoading = viewingDocId === d.id;
                      const isFlagged = d.reupload_requested;
                      const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date();
                      const isRequestingThisDoc = reuploadDoc === d.document_type;

                      return (
                        <div key={i} style={{
                          background: isFlagged ? 'rgba(201,162,75,0.08)' : isViewed ? 'rgba(30,132,73,0.05)' : '#fff',
                          border: `1px solid ${isFlagged ? 'rgba(201,162,75,0.4)' : isViewed ? 'rgba(30,132,73,0.3)' : 'var(--border)'}`,
                          borderRadius: 10, padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                <DocumentsIcon size={14} /> {docLabel}
                              </span>
                              {isViewed && (
                                <span style={{ fontSize: 10, background: 'rgba(30,132,73,0.12)', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckIcon size={10} /> VIEWED
                                </span>
                              )}
                              {d.expiry_date && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: isExpired ? '#dc2626' : '#6b7280' }}>
                                  {isExpired ? 'Expired' : 'Expires'}: {d.expiry_date}
                                </span>
                              )}
                              {isFlagged && (
                                <span style={{ fontSize: 11, color: '#9C7B2E', fontWeight: 600 }}>Re-upload Requested</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => handleViewDoc(d)}
                                disabled={isLoading}
                                className="btn btn-outline"
                                style={{
                                  padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5,
                                  background: isViewed ? 'rgba(30,132,73,0.1)' : undefined,
                                  borderColor: isViewed ? 'rgba(30,132,73,0.3)' : undefined,
                                  opacity: isLoading ? 0.7 : 1,
                                  cursor: isLoading ? 'wait' : 'pointer',
                                }}
                              >
                                <EyeIcon size={12} /> {isLoading ? 'Opening…' : isViewed ? 'Viewed' : 'View File'}
                              </button>
                              {!isFlagged && (
                                <button
                                  onClick={() => { setReuploadDoc(isRequestingThisDoc ? null : d.document_type); setReuploadReason(''); }}
                                  style={{
                                    padding: '4px 10px', fontSize: 11, border: '1px solid rgba(201,162,75,0.5)',
                                    background: isRequestingThisDoc ? 'rgba(201,162,75,0.12)' : '#fff',
                                    color: '#9C7B2E', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                                  }}
                                >
                                  <RefreshIcon size={12} /> Reupload
                                </button>
                              )}
                            </div>
                          </div>

                          {isRequestingThisDoc && (
                            <div style={{ marginTop: 10, borderTop: '1px solid rgba(201,162,75,0.35)', paddingTop: 10 }}>
                              <textarea
                                placeholder={`Reason for requesting re-upload of "${docLabel}"…`}
                                value={reuploadReason}
                                onChange={e => setReuploadReason(e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(201,162,75,0.5)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                              />
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                  disabled={reuploadSending}
                                  onClick={handleRequestReupload}
                                  style={{ flex: 1, background: 'var(--brand-gold)', color: '#142B3D', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                  {reuploadSending ? 'Sending…' : 'Send Request'}
                                </button>
                                <button
                                  onClick={() => { setReuploadDoc(null); setReuploadReason(''); }}
                                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
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

              {/* ── KYC Action Buttons ── */}
              {!detailNurse.is_verified && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                    Review the documents above, then approve or reject this nurse's KYC.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn"
                      style={{
                        flex: 1, background: 'var(--brand-gold)', color: '#142B3D',
                        opacity: canApprove ? 1 : 0.45, cursor: canApprove ? 'pointer' : 'not-allowed',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
                      <CheckIcon size={16} /> Approve KYC
                    </button>
                    <button
                      className="btn"
                      style={{ flex: 1, background: '#dc2626', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onClick={() => { setShowRejectInput(v => !v); setShowApprovePanel(false); }}
                    >
                      <XIcon size={16} /> Reject KYC
                    </button>
                  </div>

                  {showApprovePanel && (
                    <div style={{ marginTop: 14, padding: 16, borderRadius: 10, background: 'rgba(30,132,73,0.06)', border: '1px solid rgba(30,132,73,0.3)' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 12, marginTop: 0 }}>
                        Select approval reason:
                      </p>
                      {APPROVAL_REASONS.map((reason, idx) => (
                        <label key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                          background: approvalReason === reason ? 'rgba(30,132,73,0.1)' : '#fff',
                          border: `1px solid ${approvalReason === reason ? '#1E8449' : 'var(--border)'}`,
                          marginBottom: 6, transition: 'all 0.15s ease',
                        }}>
                          <input type="radio" name="approval_reason" value={reason}
                            checked={approvalReason === reason} onChange={() => setApprovalReason(reason)}
                            style={{ accentColor: '#1E8449' }} />
                          {reason}
                        </label>
                      ))}
                      <button
                        className="btn"
                        style={{ width: '100%', marginTop: 10, opacity: approvalReason ? 1 : 0.5, background: 'var(--brand-gold)', color: '#142B3D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        disabled={!approvalReason}
                        onClick={handleConfirmApproval}
                      >
                        <CheckIcon size={15} /> Confirm Approval
                      </button>
                    </div>
                  )}

                  {showRejectInput && (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        placeholder="Enter rejection reason (required)…"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid rgba(220,38,38,0.4)', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
                      />
                      <button className="btn" style={{ background: '#dc2626', color: '#fff', marginTop: 8, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onClick={() => handleReject(detailNurse.id)}>
                        <XIcon size={15} /> Submit Rejection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Assign to Interview Modal ── */}
      {showAssignModal && (
        <div style={overlay} onClick={() => setShowAssignModal(false)}>
          <div style={{ ...modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Assign {selected.size} Nurses to Interview</h2>
            {sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: '#dc2626', margin: '8px 0 16px' }}>No upcoming sessions available. All sessions are either expired or full. Create a new one on the Interviews page.</p>
            ) : (
              <div className="form-group">
                <label>Select Interview Session</label>
                <select value={assignSessionId} onChange={e => setAssignSessionId(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, background: '#fff' }}>
                  <option value="" style={{ color: 'var(--text-muted)' }}>Choose session…</option>
                  {sessions.map(s => <option key={s.id} value={s.id} style={{ color: 'var(--text)' }}>
                    {s.venue_name} — {s.interview_date} {s.interview_time} ({s.available_seats} seat{s.available_seats !== 1 ? 's' : ''} left)
                  </option>)}
                </select>
              </div>
            )}
            <button className="btn btn-primary btn-full" onClick={handleAssign}
              disabled={assignBusy || sessions.length === 0 || !assignSessionId}>
              {assignBusy ? <><span className="spinner" /> Assigning…</> : 'Assign to Interview'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </AppLayout>
  );
}

const cb = { accentColor: '#0B5E6B', width: 16, height: 16, cursor: 'pointer' };
const infoRow = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const infoLbl = { color: 'var(--text-muted)', fontWeight: 600, fontSize: 12 };
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,43,61,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 };
const modal   = { background: '#fff', borderRadius: 16, padding: 28, maxWidth: 560, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(9,25,38,0.25)' };
