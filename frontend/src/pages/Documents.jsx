import { useState, useEffect, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import { uploadDocument, getMyDocuments } from '../api/endpoints';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'nursing_degree',    label: 'Nursing Degree',             hasExpiry: false },
  { value: 'national_id',       label: 'National ID / Aadhaar',      hasExpiry: false },
  { value: 'registration_cert', label: 'Registration Certificate',   hasExpiry: false },
  { value: 'experience_letter', label: 'Experience Letter',          hasExpiry: false },
  { value: 'nursing_license',   label: 'Nursing License',            hasExpiry: true  },
];

export default function DocumentsPage() {
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loadingDocs,  setLoadingDocs]  = useState(true);
  const [file,         setFile]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [docType,      setDocType]      = useState('');
  const [expiryDate,   setExpiryDate]   = useState('');

  // For re-upload: which doc type the nurse is currently re-uploading
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

  // Fresh upload: types not yet uploaded
  const availableTypes = DOC_TYPES.filter(d => !uploadedTypes.includes(d.value));

  // The active doc type being uploaded right now
  const activeDocType = reuploadingType
    ? DOC_TYPES.find(d => d.value === reuploadingType)
    : DOC_TYPES.find(d => d.value === docType);

  useEffect(() => {
    if (!reuploadingType && availableTypes.length > 0 && !availableTypes.find(d => d.value === docType)) {
      setDocType(availableTypes[0]?.value || '');
    }
  }, [uploadedTypes.length]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const targetType = reuploadingType || docType;

    if (!file)       return toast.error('Please select a file.');
    if (!targetType) return toast.error('No document type selected.');

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      return toast.error('Only PDF, JPG, or PNG files are allowed.');
    }

    // Expiry required for nursing license
    if (activeDocType?.hasExpiry && !expiryDate) {
      return toast.error('Please enter the license expiry date.');
    }

    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', targetType);
    if (expiryDate) form.append('expiry_date', expiryDate);

    try {
      const res = await uploadDocument(form);
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
      else if (Array.isArray(detail)) detail.forEach(e => toast.error(e.msg || 'Validation error'));
      else toast.error('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allUploaded    = availableTypes.length === 0 && !loadingDocs && flaggedDocs.length === 0;
  const showUploadForm = reuploadingType || availableTypes.length > 0;

  return (
    <AppLayout title="My Documents">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Flagged / Expired Docs Alert ── */}
        {flaggedDocs.length > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '16px 20px' }}>
            <strong style={{ color: '#c2410c', fontSize: 14 }}>
              ⚠️ Action Required — {flaggedDocs.length} document{flaggedDocs.length > 1 ? 's' : ''} need re-uploading
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {flaggedDocs.map(d => {
                const label = DOC_TYPES.find(t => t.value === d.document_type)?.label || d.document_type;
                return (
                  <div key={d.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fff', borderRadius: 8, padding: '10px 14px',
                    border: '1px solid #fca5a5',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#7c2d12' }}>📄 {label}</div>
                      <div style={{ fontSize: 12, color: '#9a3412', marginTop: 3 }}>
                        {d.is_expired
                          ? `Expired on ${d.expiry_date} — Please upload a new copy.`
                          : `Admin note: ${d.reupload_reason || 'Re-upload required.'}`
                        }
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
                        background: '#ef4444', color: '#fff', border: 'none',
                        borderRadius: 7, padding: '6px 14px', fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      🔄 Re-upload
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Upload / Re-upload form */}
          <div className="card">
            <div className="card-header">
              <h2>{reuploadingType ? '🔄 Re-upload Document' : 'Upload Document'}</h2>
            </div>
            <div className="card-body">
              {loadingDocs ? (
                <div className="page-loading">Loading your documents…</div>
              ) : !showUploadForm ? (
                <div className="alert alert-info" style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <strong>All documents submitted!</strong>
                  <p className="text-muted text-small" style={{ marginTop: 8 }}>
                    Awaiting admin review. You will be notified once verified.
                    If a re-upload is needed, an alert will appear above.
                  </p>
                </div>
              ) : (
                <>
                  {/* Re-upload mode banner */}
                  {reuploadingType && (
                    <div style={{
                      background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8,
                      padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>
                        🔄 Re-uploading: <strong>{DOC_TYPES.find(d => d.value === reuploadingType)?.label}</strong>
                      </span>
                      <button
                        onClick={() => { setReuploadingType(null); setFile(null); setExpiryDate(''); }}
                        style={{ background: 'none', border: 'none', color: '#c2410c', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 12 }}>
                    Accepted formats: PDF, JPG, PNG (max 10MB)
                  </div>

                  <form onSubmit={handleUpload}>
                    {/* Document type selector — only for fresh uploads */}
                    {!reuploadingType && (
                      <div className="form-group">
                        <label>Document Type *</label>
                        <select value={docType} onChange={e => { setDocType(e.target.value); setExpiryDate(''); }}>
                          {availableTypes.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Expiry date — shown only for nursing license */}
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
                        onChange={e => setFile(e.target.files[0])}
                      />
                    </div>

                    {file && (
                      <div className="text-muted text-small mt-1">
                        Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </div>
                    )}

                    <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
                      {loading ? <><span className="spinner" /> Uploading…</> : '⬆ Upload'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Uploaded documents list */}
          <div className="card">
            <div className="card-header"><h2>My Documents</h2></div>
            <div className="card-body">
              {loadingDocs ? (
                <div className="page-loading">Loading…</div>
              ) : uploadedDocs.length === 0 ? (
                <p className="text-muted text-small">No documents uploaded yet.</p>
              ) : (
                DOC_TYPES.map(type => {
                  const uploaded = uploadedDocs.find(d => d.document_type === type.value);
                  const isFlagged = uploaded?.reupload_requested;
                  const isExpired = uploaded?.is_expired;

                  return (
                    <div
                      key={type.value}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        padding: '10px 0', borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: uploaded ? 'inherit' : 'var(--text-muted)', fontSize: 14 }}>
                          {type.label}
                        </span>
                        {uploaded ? (
                          isExpired ? (
                            <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>⚠️ Expired</span>
                          ) : isFlagged ? (
                            <span className="badge" style={{ background: '#fff7ed', color: '#c2410c' }}>🔄 Reupload Needed</span>
                          ) : (
                            <span className="badge badge-approved">✅ Uploaded</span>
                          )
                        ) : (
                          <span className="badge badge-pending">Pending</span>
                        )}
                      </div>

                      {/* Expiry date row */}
                      {uploaded?.expiry_date && (
                        <span style={{ fontSize: 11, color: isExpired ? '#dc2626' : '#6b7280', marginTop: 3 }}>
                          {isExpired ? '🔴 Expired' : '📅 Expires'}: {uploaded.expiry_date}
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
