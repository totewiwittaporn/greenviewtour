// Public editorial routes; live offers and operational data remain API-owned.
export const publicInfoRoutes = {
  '/about': {title: {th: 'รู้จักกรีนวิว ทัวร์', en: 'About Greenview Tour'}, description: {th: 'รู้จักกรีนวิว ทัวร์ เริ่มต้นทริปหมู่เกาะสุรินทร์จากคุระบุรี จังหวัดพังงา พร้อมข้อมูลสำหรับเลือกโปรแกรมและติดต่อทีมงาน', en: 'Meet Greenview Tour. Plan your Surin Islands trip from Khura Buri, Phang Nga, explore programmes and contact the team.'}},
  '/surin-islands': {title: {th: 'รู้จักหมู่เกาะสุรินทร์', en: 'Discover the Surin Islands'}, description: {th: 'รู้จักหมู่เกาะสุรินทร์ จังหวัดพังงา ธรรมชาติทางทะเล การดำน้ำตื้น และข้อควรรู้ก่อนเลือกทริปวันเดียวหรือพักค้างคืน', en: 'Discover the Surin Islands in Phang Nga: island scenery, snorkelling and considerations for a day trip or overnight stay.'}},
  '/surin-islands/travel-guide': {title: {th: 'เตรียมตัวไปเกาะสุรินทร์', en: 'Plan your Surin Islands trip'}, description: {th: 'เตรียมวันเดินทาง จำนวนผู้เดินทาง การเดินทางถึงท่าเรือ และสัมภาระก่อนเที่ยวหมู่เกาะสุรินทร์กับกรีนวิว ทัวร์', en: 'Plan your dates, group, arrival at the pier and what to bring for a Surin Islands trip with Greenview Tour.'}},
  '/faq': {title: {th: 'คำถามที่พบบ่อย', en: 'Frequently asked questions'}, description: {th: 'คำถามเรื่องโปรแกรมทัวร์สุรินทร์ สถานะคำขอจอง วันกลับ อาหาร และข้อมูลที่ควรเตรียมก่อนติดต่อกรีนวิว ทัวร์', en: 'Answers about Surin tour choices, booking requests, return dates, meals and preparing to contact Greenview Tour.'}},
  '/contact-us': {title: {th: 'ติดต่อกรีนวิว ทัวร์', en: 'Contact Greenview Tour'}, description: {th: 'ช่องทางติดต่อ ที่ตั้ง และแผนที่กรีนวิว ทัวร์จากข้อมูลบริษัท พร้อมข้อมูลที่ควรแจ้งเพื่อวางแผนทริปหมู่เกาะสุรินทร์', en: 'Find Greenview Tour contact details, location and map, and the information to share when planning your island trip.'}},
}
export const normalizePublicPath = value => value === '/' ? '/' : value.replace(/\/+$/, '')
const owned = new Set(['/', '/tours', '/promotions', ...Object.keys(publicInfoRoutes)])
export const ownsPublicPath = value => owned.has(normalizePublicPath(value))
export const publicInfo = value => publicInfoRoutes[normalizePublicPath(value)] ?? null
