import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import {
  getInterviewSessions, createInterviewSession, submitInterviewResult,
  listNurses, getVenues, uploadVenueCsv,
} from '../api/endpoints';
import toast from 'react-hot-toast';
import { InterviewIcon, CalendarIcon, ClockIcon, PinIcon, UploadIcon, DownloadIcon, PlusIcon, CheckIcon, XIcon, AlertIcon } from '../components/BrandIcons';

export default function Interviews() {
  const [sessions,       setSessions]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [scheduledNurses,setScheduledNurses]= useState([]);
  const [venues,         setVenues]         = useState([]);

  // Create session form
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ venue_name: '', venue_address: '', interview_date: '', instructions: '', hospital_id: '' });
  const [hour,     setHour]     = useState('10');
  const [min,      setMin]      = useState('00');
  const [period,   setPeriod]   = useState('AM');

  // Result modal
  const [resultNurse, setResultNurse] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, nRes, vRes] = await Promise.all([
        getInterviewSessions(), listNurses(), getVenues(),
      ]);
      setSessions(sRes.data);
      setScheduledNurses(nRes.data.filter(n => n.interview_status === 'SCHEDULED'));
      setVenues(vRes.data);
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreate = async (e) => {
    e.preventDefault();
    // Frontend guard — block past dates before even calling API
    if (form.interview_date < todayStr) {
      toast.error('Cannot schedule a session on a past date. Please select today or a future date.');
      return;
    }
    try {
      await createInterviewSession({ ...form, interview_time: `${hour}:${min} ${period}` });
      toast.success('Interview session created!');
      fetchAll();
      setShowForm(false);
      setForm({ venue_name: '', venue_address: '', interview_date: '', instructions: '', hospital_id: '' });
      setHour('10'); setMin('00'); setPeriod('AM');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create session'); }
  };

  const handleResult = async (nurseId, result) => {
    try {
      const res = await submitInterviewResult(nurseId, { result });
      if (result === 'selected' && res.data.unlock_key) {
        toast.success(`Nurse selected! CARE ID: ${res.data.unlock_key}`, { duration: 10000 });
      } else {
        toast.success('Result submitted.');
      }
      setResultNurse(null);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <AppLayout title="Interviews">

      {/* Page actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockIcon size={14} /> {scheduledNurses.length} nurse{scheduledNurses.length !== 1 ? 's' : ''} scheduled and awaiting result
        </p>
        <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => setShowForm(true)}>
          <PlusIcon size={16} /> Create Interview Session
        </button>
      </div>

      {/* ── Venue Master ── */}
      <div className="card" style={{ marginBottom: 20, padding: 18, background: 'rgba(244,248,250,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(11,94,107,0.08)', color: '#0B5E6B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PinIcon size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, color: 'var(--brand-navy)' }}>Venue Master</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {venues.length} venue{venues.length !== 1 ? 's' : ''} loaded
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--brand-gold)', color: 'var(--brand-navy)', padding: '8px 18px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 6px 16px rgba(201,162,75,0.28)' }}>
              <UploadIcon size={15} /> Upload Venue CSV
              <input
                type="file" accept=".csv" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('file', file);
                  try {
                    await uploadVenueCsv(fd);
                    toast.success('Venues uploaded!');
                    fetchAll();
                  } catch (err) {
                    const msg = err.response?.data?.detail;
                    toast.error(Array.isArray(msg) ? msg.map(m => m.msg || m).join(', ') : msg || 'Upload failed');
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <button
              onClick={() => {
                const csv = `venue_name,room_number,floor,block,branch\nApollo Hospital,Room 101,2nd Floor,Block A,Chennai\n`;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'venue_sample.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: '#eafaf1', color: '#166534',
                border: '1px solid #b7e6c7', padding: '8px 18px',
                borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <DownloadIcon size={15} /> Sample CSV
            </button>
          </div>
        </div>
        <details style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          <summary style={{ cursor: 'pointer' }}>CSV format</summary>
          <pre style={{ background: 'var(--bg)', padding: 10, borderRadius: 8, marginTop: 6, fontSize: 11 }}>
venue_name,room_number,floor,block,branch
Apollo Hospital,Room 101,2nd Floor,Block A,Chennai</pre>
        </details>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Sessions List ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CalendarIcon size={18} /> Interview Sessions ({sessions.length})</h2>
            </div>
            <div className="card-body" style={{ padding: sessions.length === 0 ? 40 : 0 }}>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--brand-teal)', opacity: 0.4, marginBottom: 12 }}><CalendarIcon size={44} /></div>
                  <p style={{ fontSize: 14 }}>No interview sessions created yet.</p>
                  <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowForm(true)}>
                    Create First Session
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Venue</th>
                        <th>Address</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => {
                        const isPast = s.interview_date < todayStr;
                        return (
                          <tr key={s.id} style={{ opacity: isPast ? 0.7 : 1 }}>
                            <td><strong>{s.venue_name}</strong></td>
                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.venue_address || '—'}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CalendarIcon size={13} /> {s.interview_date}</span>
                              {isPast && (
                                <span className="badge" style={{ marginLeft: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.35)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <AlertIcon size={11} /> Expired
                                </span>
                              )}
                            </td>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClockIcon size={13} /> {s.interview_time}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{s.instructions || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Nurses Awaiting Result ── */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><InterviewIcon size={18} /> Nurses Awaiting Interview Result ({scheduledNurses.length})</h2>
            </div>
            <div className="card-body" style={{ padding: scheduledNurses.length === 0 ? 32 : 0 }}>
              {scheduledNurses.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No nurses are currently scheduled for an interview.
                  <br />Go to <strong>Nurse Registry</strong> → select KYC Approved nurses → Assign to Interview.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Specialization</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledNurses.map(n => (
                        <tr key={n.id}>
                          <td><strong>{n.full_name}</strong></td>
                          <td style={{ fontSize: 13 }}>{n.email}</td>
                          <td>{n.specialization || '—'}</td>
                          <td>
                            <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              onClick={() => setResultNurse(n)}>
                              <CheckIcon size={13} /> Record Result
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Create Session Modal ── */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--brand-navy)' }}>Create Interview Session</h2>
              <button onClick={() => setShowForm(false)} style={closeBtn}><XIcon size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Venue Name *</label>
                {venues.length > 0 ? (
                    <select
                      required
                      value={form.venue_name}
                      onChange={e => {
                        const opt = e.target.selectedOptions[0];
                        setForm({
                          ...form,
                          venue_name: e.target.value,
                          venue_address: opt?.dataset?.address || '',
                          hospital_id: opt?.dataset?.hospitalId || '',
                        });
                      }}
                    >
                    <option value="">— Select venue —</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.venue_name} data-address={v.address} data-hospital-id={v.type === 'hospital' ? v.id.replace('hosp_', '') : ''}>
                        {v.venue_name}{v.room_number ? ` · Room ${v.room_number}` : ''}{v.floor ? ` · ${v.floor}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input required value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })} placeholder="Upload Venue CSV above, or type manually" />
                )}
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.venue_address} onChange={e => setForm({ ...form, venue_address: e.target.value })} placeholder="Full address" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Date *</label>
                  <input required type="date"
                    min={todayStr}
                    value={form.interview_date}
                    onChange={e => setForm({ ...form, interview_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={hour} onChange={e => setHour(e.target.value)} style={selStyle}>
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => <option key={h}>{h}</option>)}
                    </select>
                    <span style={{ fontWeight: 700, alignSelf: 'center' }}>:</span>
                    <select value={min} onChange={e => setMin(e.target.value)} style={selStyle}>
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <select value={period} onChange={e => setPeriod(e.target.value)} style={selStyle}>
                      <option>AM</option><option>PM</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Instructions (optional)</label>
                <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Bring original documents, dress professionally…"
                  style={{ minHeight: 70, resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary btn-full" type="submit">Create Session</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Interview Result Modal ── */}
      {resultNurse && (
        <div style={overlay} onClick={() => setResultNurse(null)}>
          <div style={{ ...modal, maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(18,151,169,0.1)', color: 'var(--brand-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <InterviewIcon size={26} />
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--brand-navy)' }}>Interview Result</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, marginTop: 6 }}>
              Mark the interview result for <strong>{resultNurse.full_name}</strong>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-success" style={{ padding: '12px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={() => handleResult(resultNurse.id, 'selected')}>
                <CheckIcon size={17} /> Passed
              </button>
              <button className="btn btn-danger" style={{ padding: '12px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={() => handleResult(resultNurse.id, 'not_selected')}>
                <XIcon size={17} /> Failed
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
              If selected, a shift unlock key will be generated and shown.
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const closeBtn = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, display: 'flex', borderRadius: 8 };
const overlay  = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,43,61,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 };
const modal    = { background: '#fff', borderRadius: 16, padding: 28, maxWidth: 540, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(9,25,38,0.25)' };
const selStyle = { padding: '8px 6px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, flex: 1 };
