import { CheckIcon, DroneIcon } from '../components/BrandIcons';

const BULLETS = [
  'Empowering healthcare professionals',
  'Drone-powered medical delivery',
  'Built for caregiver growth',
];

/**
 * AuthLayout — CARENIUM split-screen shell.
 * Left: brand storytelling panel (wordmark, EKG, drone watermark, drift orbs).
 * Right: the form card passed as children.
 */
export default function AuthLayout({ children, headline, tagline = 'Healthcare · Technology · Growth' }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />

        <div className="auth-drone" aria-hidden="true">
          <DroneIcon />
        </div>

        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <img src="/carenium-logo.jpg" alt="Carenium logo" />
            <span className="auth-wordmark">CARE<em>NIUM</em></span>
          </div>

          <h1>
            {headline}
          </h1>

          <p className="auth-brand-tagline">{tagline}</p>

          <div className="auth-bullets">
            {BULLETS.map(b => (
              <div key={b} className="auth-bullet">
                <CheckIcon />
                <span>{b}</span>
              </div>
            ))}
          </div>

          <svg className="ekg" viewBox="0 0 320 52" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,26 H92 L100,26 L108,14 L116,38 L124,24 L132,26 H200 L208,26 L216,12 L224,40 L232,22 L240,26 H320" />
          </svg>

          <div className="auth-brand-footer">Carenium Health Platform</div>
        </div>
      </aside>

      <main className="auth-form-side">{children}</main>
    </div>
  );
}
