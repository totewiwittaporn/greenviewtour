export function AuthLayout({ title, description, children }) {
  return <main className="auth-layout"><section className="auth-story" aria-label="Greenview Tour team">
    <img className="auth-photo" src="https://greenviewtour.com/wp-content/uploads/2025/01/DJI_0351.jpg" alt="" />
    <a className="auth-brand" href="http://localhost:5173"><img src="https://greenviewtour.com/wp-content/uploads/2024/12/greenview-tour-logo-1.png" alt="Greenview Tour" /></a>
    <div className="auth-story-copy"><span className="eyebrow">GREENVIEW TOUR · TEAM WORKSPACE</span><h1>Every great trip<br />starts with our team.</h1><p>A shared space for the people behind the journey.</p></div><span className="auth-location">KURABURI · PHANG NGA · THAILAND</span>
  </section><section className="auth-panel"><div className="auth-form-wrap"><a className="auth-back" href="http://localhost:5173">← Public website</a><span className="eyebrow">COMPANY WORKSPACE</span><h2>{title}</h2><p className="auth-description">{description}</p>{children}<footer className="auth-footer">Greenview Tour <span>Local workspace</span></footer></div></section></main>
}
