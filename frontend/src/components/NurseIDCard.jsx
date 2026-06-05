/**
 * NurseIDCard — Credit card style design for Carenium Nurse ID.
 * Styled like a debit/credit card with gradient, embossed font, and validity dates.
 */
export default function NurseIDCard({ data }) {
  if (!data) return null;

  return (
    <div style={cardStyle}>
      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, color: '#fff' }}>CARENIUM</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Nurse Platform</div>
        </div>
        <div style={{ fontSize: 28 }}>🏥</div>
      </div>

      {/* Card Number */}
      <div style={{ margin: '20px 0 16px', textAlign: 'center' }}>
        <div style={{
          fontSize: 22,
          fontFamily: "'Courier New', monospace",
          fontWeight: 700,
          letterSpacing: 4,
          color: '#fff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        }}>
          {data.unique_id}
        </div>
      </div>

      {/* Validity Section */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 12 }}>
        <div>
          <div style={labelStyle}>VALID FROM</div>
          <div style={valueStyle}>{data.valid_from}</div>
        </div>
        <div>
          <div style={labelStyle}>VALID UPTO</div>
          <div style={valueStyle}>{data.valid_upto}</div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            {data.nurse_name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            Reg: {data.registration_number}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 10,
          color: '#fff',
          fontWeight: 600,
        }}>
          NURSE ID
        </div>
      </div>

      {/* Shine overlay effect */}
      <div style={shineStyle} />
    </div>
  );
}

const cardStyle = {
  width: 360,
  height: 220,
  background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  borderRadius: 16,
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(44,83,100,0.3)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const labelStyle = {
  fontSize: 9,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: 1.2,
  fontWeight: 600,
  textTransform: 'uppercase',
};

const valueStyle = {
  fontSize: 15,
  color: '#fff',
  fontFamily: "'Courier New', monospace",
  fontWeight: 700,
  marginTop: 2,
};

const shineStyle = {
  position: 'absolute',
  top: 0,
  left: '-50%',
  width: '200%',
  height: '100%',
  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 60%)',
  pointerEvents: 'none',
};
