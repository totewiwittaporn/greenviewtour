// Answers follow the current request/capacity contracts, not historical marketing copy.
export const faq = {
  image: 'surin-coral.webp', homeAnchor: 'surin', faq: true,
  sections: [
    {id: 'request-confirmation', title: {th: 'ส่งคำขอจองแล้ว เท่ากับยืนยันการจองหรือยัง?', en: 'Does submitting a request confirm my booking?'}, paragraphs: {
      th: ['ยังไม่เท่ากันค่ะ ให้ดูสถานะในรายการของคุณและการยืนยันจากทีมงาน โดยเฉพาะรายการที่รอตรวจความพร้อม การเห็นข้อความว่าส่งคำขอสำเร็จไม่ได้หมายความว่ามีที่นั่งที่ยืนยันแล้ว'],
      en: ['Not yet. Check your request status and the team’s confirmation, especially when availability needs review. A successful submission is not confirmation of a reserved seat.'],
    }},
    {id: 'group-size', title: {th: 'จำนวนที่ว่างรวมเพียงพอ จองทั้งกลุ่มได้เสมอไหม?', en: 'Do enough total seats always mean my group fits?'}, paragraphs: {
      th: ['ไม่เสมอไปค่ะ ระบบต้องตรวจการรองรับทั้งกลุ่มในแต่ละขา ไม่ใช่แค่รวมที่นั่งที่เหลือจากหลายลำ เมื่อยังรองรับไม่ได้ อาจต้องรอทีมงานตรวจความพร้อมหรือพิจารณาวันอื่นที่คุณยอมรับ'],
      en: ['Not always. The system checks whether your whole group can fit on each leg, not just the sum of seats across boats. The team may need to review availability or offer another date for your agreement.'],
    }},
    {id: 'inclusions', title: {th: 'อาหาร ที่พัก และรถรับส่งรวมอยู่หรือไม่?', en: 'Are meals, accommodation and transfers included?'}, paragraphs: {
      th: ['ขึ้นอยู่กับโปรแกรมและรายการที่เลือกค่ะ ตรวจหัวข้อรวมในราคา–ไม่รวมในราคา อาหาร ที่พัก และการรับส่งของโปรแกรมนั้น แล้วให้ทีมงานยืนยันรายการเพิ่มเติมที่คุณต้องการ'],
      en: ['It depends on the programme and selected services. Check its inclusions, exclusions, meals, accommodation and transfers, then ask the team to confirm any additions you need.'],
    }},
    {id: 'return-date', title: {th: 'ยังไม่ทราบวันกลับ ต้องทำอย่างไร?', en: 'What if I do not know my return date?'}, paragraphs: {
      th: ['แจ้งทีมงานก่อนเลือกโปรแกรมค่ะ โปรแกรมที่กำหนดระยะเวลาแน่นอนกับการเดินทางแบบยังไม่ทราบวันกลับมีเงื่อนไขต่างกัน วันที่ยังไม่ระบุไม่ได้หมายความว่ามีที่นั่งขากลับแล้ว'],
      en: ['Tell the team before choosing a programme. Fixed-duration trips and journeys with an undecided return date have different arrangements. An unspecified return date does not mean a return seat is reserved.'],
    }},
    {id: 'children', title: {th: 'เดินทางกับเด็ก ต้องแจ้งข้อมูลอะไร?', en: 'What should I share when travelling with children?'}, paragraphs: {
      th: ['แจ้งจำนวนเด็กและอายุให้ทีมงานตรวจเงื่อนไขของโปรแกรมที่เลือกค่ะ อย่าใช้อัตราหรือช่วงอายุจากโปรแกรมอื่นแทน เพราะแต่ละโปรแกรมอาจกำหนดต่างกัน'],
      en: ['Share the number and ages of children so the team can check the selected programme’s policy. Do not substitute a rate or age band from another programme.'],
    }},
    {id: 'dietary-needs', title: {th: 'มีอาหารที่แพ้หรือความต้องการพิเศษ แจ้งได้ไหม?', en: 'Can I tell you about allergies or special requirements?'}, paragraphs: {
      th: ['แจ้งล่วงหน้าได้ค่ะ ระบุสิ่งที่แพ้หรือความช่วยเหลือที่ต้องการอย่างชัดเจน แล้วตรวจคำตอบจากทีมงานว่ารองรับรายการใดได้ก่อนเดินทาง'],
      en: ['Yes, please tell the team in advance. State the allergy or assistance needed clearly and check which arrangements the team can accommodate before travelling.'],
    }},
    {id: 'payment', title: {th: 'ควรชำระเงินตามข้อมูลที่ไหน?', en: 'Which payment instructions should I follow?'}, paragraphs: {
      th: ['ใช้รายละเอียดในรายการจองของคุณและช่องทางบริษัทที่ตรวจสอบได้ค่ะ อย่าใช้หมายเลขบัญชีจากบทความหรือภาพที่ส่งต่อกัน และไม่ถือว่าการแจ้งว่าชำระแล้วเป็นการยืนยันรับเงินจนกว่าสถานะจะได้รับการตรวจสอบ'],
      en: ['Use the instructions in your own booking and verified company channels. Do not use bank details from articles or forwarded images. A payment message is not confirmation of received funds until the status has been checked.'],
    }},
    {id: 'conditions', title: {th: 'ดูวันเปิดเที่ยวและเวลาเรือจากบทความนี้ได้ไหม?', en: 'Can I use this article as the operating schedule?'}, paragraphs: {
      th: ['ไม่ได้ค่ะ บทความเป็นข้อมูลเตรียมตัว ไม่ใช่ประกาศเปิดพื้นที่หรือตารางเรือ ตรวจรายละเอียดล่าสุดจากทีมงานและประกาศอุทยานฯ สำหรับวันเดินทางจริง'],
      en: ['No. This is planning information, not an opening notice or boat timetable. Check the team’s latest instructions and park announcements for your actual travel date.'],
    }},
  ],
}
