const entry=(en,th,bodyEn,bodyTh)=>({heading:{en,th},body:{en:bodyEn,th:bodyTh}})
export function capacityManualSections(role){
 const rows=[]
 if(['ADMIN_MANAGER','MANAGER','BOOKING','HEAD_BOOKING','GUIDE','HEAD_GUIDE','HEAD_DRIVER'].includes(role)){
  rows.push(entry('Whole-group capacity','ความจุที่รองรับทั้ง Booking',
   'Open Vehicle & boat readiness for the service date. Only confirmed READY vehicles count. Proposed rentals and unavailable vehicles do not. A Booking group must fit one boat in each selected leg; total spare seats alone are not sufficient. Outbound and return are checked on their actual dates. Open-return bookings do not reserve an unknown return date.',
   'เปิดความพร้อมรถและเรือตามวันบริการ นับเฉพาะรถหรือเรือที่ยืนยันว่าพร้อม รายการเสนอเช่าหรือไม่พร้อมยังไม่นับ ทั้ง Booking ต้องลงเรือลำเดียวกันในแต่ละขา ที่ว่างรวมอย่างเดียวไม่เพียงพอ ตรวจวันไปและวันกลับจริง โปรแกรมที่ยังไม่ทราบวันกลับยังไม่ได้กันที่ขากลับ'))
  rows.push(entry('Do not confirm before readiness','ยังไม่พร้อม ห้าม Confirm ลูกค้า',
   'A request can remain open when capacity is insufficient, but its Booking is not confirmed. Coordinate extra verified boats or propose a different service date. Customer proposals do not change the date until the customer agrees to the new date, price and terms. Temporary seat holds expire; confirmation rechecks every channel under one transaction. A price quote or promotion quota is not a boat-seat promise.',
   'รับคำขอไว้ได้แม้ความจุไม่พอ แต่ยังไม่ Confirm ลูกค้า ประสานหาเรือเพิ่มที่ยืนยันพร้อมจริง หรือเสนอวันอื่น วันจะไม่เปลี่ยนจนกว่าลูกค้ายอมรับวัน ราคา และเงื่อนไขใหม่ การกันที่ชั่วคราวมีวันหมดอายุ ก่อน Confirm ระบบตรวจทุกช่องทางในธุรกรรมเดียว ราคาเสนอและโควตาโปรโมชั่นไม่ใช่คำรับรองที่นั่งเรือ'))
 }
 if(['ADMIN_MANAGER','MANAGER','GUIDE','HEAD_GUIDE','HEAD_DRIVER'].includes(role)){
  rows.push(entry('Readiness and real assignments','ตั้งความพร้อมและจัดงานจริง',
   'Authorized boat/vehicle planners create a service window with actual date, direction, time, compatible services, vehicles, usable capacity and an explicit hold duration. Mark a proposed rental READY only after it is secured. Suggested plans do not assign boats or staff. Boat reassignment uses Move whole Booking and keeps the original assignment if the target fails. Legacy confirmed bookings without a recorded window can be explicitly reconciled with a reason; this never confirms a new booking.',
   'ผู้มีสิทธิ์จัดรถหรือเรือกำหนดวัน ขา เวลา บริการที่จัดร่วมกันได้ รถหรือเรือ ความจุลูกค้าจริง และระยะเวลากันที่ เปลี่ยนเรือเสนอเช่าเป็นพร้อมใช้เมื่อยืนยันได้เรือแล้ว แผนแนะนำไม่จัดเรือหรือพนักงานให้อัตโนมัติ ใช้ย้ายทั้ง Booking เมื่อต้องเปลี่ยนเรือ หากที่ใหม่ไม่พอรายการเดิมจะคงอยู่ Booking เดิมที่ Confirm แล้วแต่ไม่มีรอบบันทึกไว้ สามารถระบุรอบพร้อมเหตุผล โดยไม่ใช่การ Confirm รายการใหม่'))
  rows.push(entry('Van luggage estimate','ประมาณรถเผื่อสัมภาระ',
   'The default overnight load factor is 1.2 planning units per traveller and is configurable by service window. Actual passenger counts remain unchanged. Estimates pack whole passengers within each vehicle, then show extra unconfirmed vehicles using an explicit reference size. This is not an optimized route: verify actual seats, luggage, pickups, travel times and driver availability before assigning.',
   'ค่าเริ่มต้นลูกค้าค้างคืนใช้ 1.2 หน่วยความจุต่อคน ปรับได้ตามรอบบริการ จำนวนลูกค้าจริงไม่เปลี่ยน การประเมินใส่ผู้โดยสารเป็นคนเต็มในรถแต่ละคัน และแยกรถเสริมที่ยังไม่ยืนยันโดยบอกขนาดรถที่สมมุติไว้ ต้องตรวจที่นั่งจริง สัมภาระ จุดรับ เวลาเดินทาง และความพร้อมคนขับก่อนจัดงาน'))
 }
 if(['CAPTAIN','HEAD_CAPTAIN','ASSISTANT_CAPTAIN'].includes(role))rows.push(entry('Assigned vessel only','ดูงานเรือที่ได้รับมอบหมาย',
  'Your work follows the vessel/run where you are assigned, not every vessel and not a permanent captain-to-boat binding. A changed assignment may move you to another vessel. Passenger groups remain together per leg; ask the authorized planner to make assignment changes.',
  'ดูงานตามเรือหรือเที่ยวที่ได้รับมอบหมาย ไม่ใช่ทั้งกองเรือ และไม่ผูกกัปตันกับเรือลำเดิมถาวร เมื่อหน้างานเปลี่ยนก็เปลี่ยนเรือได้ตามการจัดงาน ลูกค้าใน Booking เดียวกันต้องอยู่ด้วยกันในแต่ละขา ให้ผู้มีสิทธิ์จัดงานเป็นผู้เปลี่ยนรายการ'))
 return rows
}
