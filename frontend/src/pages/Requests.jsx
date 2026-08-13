import AppLayout from '../layouts/AppLayout';
import { PackageIcon, LockIcon } from '../components/BrandIcons';

export default function RequestsPage() {
  return (
    <AppLayout title="Delivery Requests">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, margin: '0 auto 22px', background: 'linear-gradient(135deg, rgba(18,151,169,0.14), rgba(11,94,107,0.08))', color: '#0B5E6B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(11,94,107,0.12)' }}>
            <PackageIcon size={38} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Delivery Requests
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 24 }}>
            This section is <strong>coming soon</strong>.<br />
            It will be available once your working schedule has been assigned by your hospital admin.
          </p>
          <div style={{
            background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 999,
            padding: '10px 22px', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <LockIcon size={14} style={{ color: 'var(--brand-gold)' }} />
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>
              Section Locked — Coming Soon
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
