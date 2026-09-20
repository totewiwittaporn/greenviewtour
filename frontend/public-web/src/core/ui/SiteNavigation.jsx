const base='https://greenviewtour.com'
const local=['localhost','127.0.0.1'].includes(location.hostname)
const customerLogin=local?'http://localhost:5175/login':'https://member.greenviewtour.com/login'
const staffLogin=local?'http://localhost:5174/login':import.meta.env.VITE_STAFF_LOGIN_URL
export function SiteHeader(){return <header className="site-header"><a href="/" aria-label="Greenview Tour หน้าแรก"><img className="logo" src={`${base}/wp-content/uploads/2024/12/greenview-tour-logo-1.png`} alt="Greenview Tour"/></a><nav aria-label="เมนูหลัก"><a href="/tours">โปรแกรมทัวร์</a><a href="/promotions">โปรโมชั่น</a><a href="/#surin">รู้จักเกาะสุรินทร์</a><a href="/#contact">ติดต่อเรา</a></nav><a className="public-button customer-login" href={customerLogin}>เข้าสู่ระบบลูกค้า</a></header>}
export function SiteFooter(){return <footer className="public-footer"><a href="/" aria-label="Greenview Tour หน้าแรก"><img className="logo" src={`${base}/wp-content/uploads/2024/12/greenview-tour-logo-1.png`} alt="Greenview Tour"/></a><span>คุระบุรี · พังงา · ประเทศไทย</span>{staffLogin&&<a className="staff-login" href={staffLogin}>สำหรับพนักงาน</a>}</footer>}
