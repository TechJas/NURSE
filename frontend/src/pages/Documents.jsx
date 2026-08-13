import { useState, useEffect, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import { uploadDocument, getMyDocuments } from '../api/endpoints';
import toast from 'react-hot-toast';
import { DocumentsIcon, UploadIcon, AlertIcon, RefreshIcon, XIcon, CheckIcon, ClockIcon } from '../components/BrandIcons';

const DOC_TYPES = [
  { value: 'nursing_degree',    label: 'Nursing Degree',           hasExpiry: false },
  { value: 'national_id',       label: 'National ID / Aadhaar',    hasExpiry: false },
  { value: 'registration_cert', label: 'Registration Certificate', hasExpiry: false },
  { value: 'experience_letter', label: 'Experience Letter',        hasExpiry: false },
  { value: 'nursing_license',   label: 'Nursing License',          hasExpiry: true  },
];

const typeLabel = t => DOC_TYPES.find(d => d.value === t)?.label || t;
const daysUntil = expiry => Math.ceil((new Date(expiry + 'T00:00:00') - new Date()) / 86400000);

export default function DocumentsPage() {
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loadingDocs,  setLoadingDocs]  = useState(true);
  const [file,         setFile]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [docType,      setDocType]      = useState('');
  const [expiryDate,   setExpiryDate]   = useState('');
  const [dragging,     setDragging]     = useState(false);

  const [reuploadingType, setReuploadingType] = useState(null);
  const fileRef = useRef();

  const fetchMyDocuments = async () => {
    try {
      const res = await getMyDocuments();
      setUploadedDocs(res.data);
    } catch {
      toast.error('Could not load your uploaded documents.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => { fetchMyDocuments(); }, []);

  const uploadedTypes  = uploadedDocs.map(d => d.document_type);
  const flaggedDocs    = uploadedDocs.filter(d => d.reupload_requested || d.is_expired);

  const availableTypes = DOC_TYPES.filter(d => !uploadedTypes.includes(d.value));

  const activeDocType = reuploadingType
    ? DOC_TYPES.find(d => d.value === reuploadingType)
    : DOC_TYPES.find(d => d.value === docType);

  useEffect(() => {
    if (!reuploadingType && availableTypes.length > 0 && !availableTypes.find(d => d.value === docType)) {
      setDocType(availableTypes[0]?.value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedTypes.length, reuploadingType]);

  const pickFile = f => {
    if (!f) return;
    setFile(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const targetType = reuploadingType || docType;

    if (!file)       return toast.error('Please select a file.');
    if (!targetType) return toast.error('No document type selected.');

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      return toast.error('Only PDF, JPG, or PNG files are allowed.');
    }

    if (activeDocType?.hasExpiry && !expiryDate) {
      return toast.error('Please enter the license expiry date.');
    }

    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', targetType);
    if (expiryDate) form.append('expiry_date', expiryDate);

    try {
      await uploadDocument(form);
      if (reuploadingType) {
        toast.success('Document re-uploaded! Admin will review and re-approve your KYC.');
      } else {
        toast.success('Document uploaded successfully!');
      }
      setFile(null);
      setExpiryDate('');
      setReuploadingType(null);
      if (fileRef.current) fileRef.current.value = '';
      e.target.reset();
      await fetchMyDocuments();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') toast.error(detail);
      else if (Array.isArray(detail)) detail.forEach(x => toast.error(x.msg || 'Validation error'));
      else toast.error('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showUploadForm = reuploadingType || availableTypes.length > 0;

  return (
    <AppLayout title="My Documents">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Flagged / Expired Docs Alert (gold) ── */}
        {flaggedDocs.length > 0 && (
          <div style={{
            background: 'linear-gradient(120deg, rgba(201,162,75,0.12), rgba(201,162,75,0.05))',
            border: '1px solid rgba(201,162,75,0.4)', borderRadius: 14, padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9C7B2E' }}>
              <AlertIcon size={18} />
              <strong style={{ fontSize: 14 }}>
                Action Required — {flaggedDocs.length} document{flaggedDocs.length > 1 ? 's' : ''} need re-uploading
              </strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {flaggedDocs.map(d => (
                <div key={d.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fff', borderRadius: 10, padding: '12px 16px',
                  border: '1px solid rgba(220,38,38,0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(220,38,38,0.1)', color: '#dc2626',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DocumentsIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#7f1d1d' }}>{typeLabel(d.document_type)}</div>
                      <div style={{ fontSize: 12, color: '#9a3412', marginTop: 3 }}>
                        {d.is_expired
                          ? `Expired on ${d.expiry_date} — Please upload a new copy.`
                          : `Admin note: ${d.reupload_reason || 'Re-upload required.'}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setReuploadingType(d.document_type);
                      setFile(null);
                      setExpiryDate('');
                      if (fileRef.current) fileRef.current.value = '';
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(220,38,38,0.25)',
                    }}
                  >
                    <RefreshIcon size={14} /> Re-upload
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          <div className="two-col-grid" style={{ gridTemplateColumns: '1fr', gap: 0 }}>

            {/* ── Upload / Re-upload form ── */}
            <div className="card">
              <div className="card-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {reuploadingType ? <><RefreshIcon size={18} /> Re-upload Document</>
                                   : <><UploadIcon size={18} /> Upload Document</>}
                </h2>
              </div>
              <div className="card-body">
                {loadingDocs ? (
                  <div className="page-loading">Loading your documents…</div>
                ) : !showUploadForm ? (
                  <div style={{
                    textAlign: 'center', padding: '28px 20px', borderRadius: 14,
                    background: 'linear-gradient(120deg, rgba(11,94,107,0.08), rgba(18,151,169,0.04))',
                    border: '1px solid rgba(11,94,107,0.25)',
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px', background: 'rgba(11,94,107,0.12)', color: '#0B5E6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckIcon size={26} />
                    </div>
                    <strong style={{ fontSize: 15, color: '#0B5E6B' }}>All documents submitted!</strong>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                      Awaiting admin review. You will be notified once verified.
                      If a re-upload is needed, an alert will appear above.
                    </p>
                  </div>
                ) : (
                  <>
                    {reuploadingType && (
                      <div style={{
                        background: 'rgba(201,162,75,0.12)', border: '1px solid rgba(201,162,75,0.4)', borderRadius: 10,
                        padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#9C7B2E',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RefreshIcon size={14} />
                          Re-uploading: <strong>{typeLabel(reuploadingType)}</strong>
                        </span>
                        <button
                          onClick={() => { setReuploadingType(null); setFile(null); setExpiryDate(''); }}
                          style={{ background: 'none', border: 'none', color: '#9C7B2E', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleUpload}>
                      {!reuploadingType && (
                        <div className="form-group">
                          <label>Document Type *</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {availableTypes.map(d => {
                              const active = docType === d.value;
                              return (
                                <button
                                  type="button"
                                  key={d.value}
                                  onClick={() => { setDocType(d.value); setExpiryDate(''); }}
                                  style={{
                                    padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', border: active ? '1px solid var(--brand-cyan)' : '1px solid var(--border)',
                                    background: active ? 'rgba(18,151,169,0.1)' : '#fff',
                                    color: active ? '#0B5E6B' : 'var(--text-muted)',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeDocType?.hasExpiry && (
                        <div className="form-group">
                          <label>License Expiry Date *</label>
                          <input
                            type="date"
                            value={expiryDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setExpiryDate(e.target.value)}
                            style={{ display: 'block', width: '100%' }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            System will automatically remind you to re-upload when it expires.
                          </span>
                        </div>
                      )}

                      <div className="form-group">
                        <label>Select File *</label>
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => pickFile(e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                        <div
                          onClick={() => fileRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); setDragging(true); }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
                          style={{
                            border: `2px dashed ${dragging ? 'var(--brand-gold)' : 'var(--brand-cyan)'}`,
                            borderRadius: 14, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
                            background: dragging ? 'rgba(201,162,75,0.06)' : 'rgba(11,94,107,0.04)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ width: 46, height: 46, borderRadius: '50%', margin: '0 auto 10px', background: 'rgba(18,151,169,0.12)', color: '#0B5E6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UploadIcon size={20} />
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {file ? file.name : 'Drag & drop your file here'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            {file ? `(${(file.size / 1024).toFixed(0)} KB)` : 'or click to browse — PDF, JPG, PNG (max 10MB)'}
                          </div>
                        </div>
                      </div>

                      <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
                        {loading ? <><span className="spinner" /> Uploading…</>
                                 : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><UploadIcon size={16} /> {reuploadingType ? 'Re-upload Document' : 'Upload Document'}</span>}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Uploaded documents list ── */}
          <div className="card">
            <div className="card-header"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><DocumentsIcon size={18} /> My Documents</h2></div>
            <div className="card-body" style={{ padding: '8px 20px' }}>
              {loadingDocs ? (
                <div className="page-loading">Loading…</div>
              ) : uploadedDocs.length === 0 ? (
                <p className="text-muted text-small" style={{ padding: '20px 0' }}>No documents uploaded yet.</p>
              ) : (
                DOC_TYPES.map(type => {
                  const uploaded = uploadedDocs.find(d => d.document_type === type.value);
                  const isFlagged = uploaded?.reupload_requested;
                  const isExpired = uploaded?.is_expired;
                  const daysLeft = uploaded?.expiry_date ? daysUntil(uploaded.expiry_date) : null;
                  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

                  let badge = { bg: '#eafaf1', color: '#1e8449', text: 'Uploaded', icon: <CheckIcon size={12} /> };
                  if (isExpired)      badge = { bg: '#fee2e2', color: '#991b1b', text: 'Expired', icon: <AlertIcon size={12} /> };
                  else if (isFlagged) badge = { bg: 'rgba(201,162,75,0.14)', color: '#9C7B2E', text: 'Re-upload Needed', icon: <RefreshIcon size={12} /> };
                  else if (expiringSoon) badge = { bg: '#fef3c7', color: '#92400e', text: 'Expires Soon', icon: <ClockIcon size={12} /> };
                  else if (!uploaded) badge = { bg: '#f1f5f9', color: '#64748b', text: 'Pending', icon: <ClockIcon size={12} /> };

                  return (
                    <div key={type.value} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: uploaded ? 'inherit' : 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>{type.label}</span>
                        <span className="badge" style={{ background: badge.bg, color: badge.color, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                          {badge.icon} {badge.text}
                        </span>
                      </div>
                      {uploaded?.expiry_date && (
                        <span style={{ fontSize: 11, marginTop: 4, color: isExpired ? '#dc2626' : expiringSoon ? '#92400e' : '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <ClockIcon size={12} />
                          {isExpired
                            ? `Expired on ${uploaded.expiry_date}`
                            : expiringSoon
                              ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${uploaded.expiry_date})`
                              : `Expires: ${uploaded.expiry_date}`}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
