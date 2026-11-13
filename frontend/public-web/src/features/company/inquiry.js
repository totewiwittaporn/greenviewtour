export function inquiryMessage({tour, promotion, date, adults, children} = {}, locale = 'th') {
  const en = locale === 'en'
  return [en ? 'Hello Greenview Tour, I would like to enquire about a trip.' : 'สวัสดี Greenview Tour สนใจสอบถามทริปค่ะ/ครับ',
    tour && `${en ? 'Programme' : 'โปรแกรม'}: ${tour}`,
    promotion && `${en ? 'Promotion' : 'โปรโมชั่น'}: ${promotion}`,
    date && `${en ? 'Travel date' : 'วันเดินทาง'}: ${date}`,
    adults && `${en ? 'Adults' : 'ผู้ใหญ่'}: ${adults}`,
    children != null && children !== '' && `${en ? 'Children' : 'เด็ก'}: ${children}`,
    en ? 'Please check availability and details. This is an enquiry, not a confirmed booking.' : 'รบกวนตรวจสอบที่ว่างและรายละเอียด ข้อความนี้เป็นการสอบถาม ยังไม่ใช่การยืนยันการจอง',
  ].filter(Boolean).join('\n')
}
// CMS announcements may still contain legacy destinations. Never expose a paused flow.
export function isPausedContactLink(value) {
  try {
    const url = new URL(value, 'https://public.greenviewtour.com')
    return url.hostname === 'member.greenviewtour.com' ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.port === '5175' ||
      /^\/(member|checkout|payment|register|login)(\/|$)/i.test(url.pathname)
  } catch { return false }
}
