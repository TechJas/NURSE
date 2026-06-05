import AppLayout from '../layouts/AppLayout';

export default function RequestsPage() {
  return (
    <AppLayout title="Delivery Requests">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>📦</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Delivery Requests
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 20 }}>
            This section is <strong>coming soon</strong>.<br />
            It will be available once your working schedule has been assigned by your hospital admin.
          </p>
          <div style={{
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            borderRadius: 10, padding: '14px 20px', display: 'inline-block',
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              🔒 Section Locked — Coming Soon
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
