export function AuthLayout({ title, description, children }) {
  return <main className="auth-layout"><section className="auth-panel"><div className="auth-form-wrap"><a className="auth-back" href="http://localhost:5173">← Public website</a><span className="eyebrow">GREENVIEW TOUR · COMPANY WORKSPACE</span><h2>{title}</h2><p className="auth-description">{description}</p>{children}<footer className="auth-footer">Greenview Tour <span>Staff access</span></footer></div></section></main>
}
