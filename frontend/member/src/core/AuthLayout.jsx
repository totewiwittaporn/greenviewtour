export default function AuthLayout({children}) {
 return <div className="member-auth-layout"><aside className="member-auth-story" aria-label="เที่ยวกับ Greenview Tour"><img src="https://greenviewtour.com/wp-content/uploads/2025/01/DJI_0351.jpg" alt=""/><div><p>GREENVIEW TOUR · คุระบุรี พังงา</p><h2>ทะเลสวยรออยู่<br/>ทริปต่อไปของคุณเริ่มที่นี่</h2><p>เลือกวันพักผ่อน แล้วให้เราดูแลการเดินทาง</p></div></aside><div className="member-auth-form">{children}</div></div>
}
