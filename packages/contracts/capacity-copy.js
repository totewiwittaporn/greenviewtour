// Browser-safe copy only; each app renders its own Core controls.
const copy = {
 serviceReview:['รายการนี้ต้องให้ทีมตรวจความพร้อมของบริการก่อนยืนยัน','The team must verify service readiness before confirming this request.'],
 vanExtra:['รถเสริมโดยประมาณ {count} คัน ขนาด {capacity} ที่นั่งต่อคัน ยังไม่ใช่รถที่ยืนยันพร้อม','Estimated additional vehicles: {count}, assuming {capacity} seats each. These are not confirmed vehicles.'],
 title:['ความพร้อมรถและเรือ','Vehicle & boat readiness'], check:['ตรวจที่นั่งทั้งกลุ่ม','Check whole-group availability'],
 loading:['กำลังตรวจสอบที่ว่าง…','Checking availability…'], error:['ตรวจที่ว่างไม่สำเร็จ กรุณาลองอีกครั้ง','Unable to check availability. Please retry.'],
 available:['รองรับทั้งกลุ่มได้ขณะนี้ · ยังไม่ยืนยัน Booking','Your whole group fits now · Booking not yet confirmed'],
 waiting:['รอทีมยืนยันความพร้อม · ยังไม่ยืนยัน Booking','Waiting for team readiness · Booking not confirmed'],
 remaining:['ที่นั่งว่างรวม','Total remaining seats'], group:['ผู้เดินทางใน Booking นี้','Travellers in this Booking'], seats:['ที่นั่ง','seats'],
 noSplit:['ทั้ง Booking ต้องอยู่เรือลำเดียวกันในแต่ละขา','The whole Booking must stay on one boat per leg.'],
 notPromise:['ที่ว่างอาจเปลี่ยน ระบบจะตรวจซ้ำเมื่อส่งคำขอและก่อนยืนยัน','Availability may change. We recheck on submission and before confirmation.'],
 noPay:['กรุณารอทีมยืนยันความพร้อมก่อนชำระเงิน','Please wait for team confirmation before paying.'],
 fit:['รองรับทั้งกลุ่มได้','Whole group fits'], noFit:['ยังไม่รองรับทั้งกลุ่ม','Whole group cannot currently be accommodated'],
 unknown:['ยังยืนยันความจุไม่ได้','Capacity is not verified'], window:['รอบบริการ','Service window'], choose:['เลือกรอบบริการ','Select a service window'],
 OUTBOUND:['ขาไป','Outbound'], RETURN:['ขากลับ','Return'], BOAT:['เรือ','Boat'], VEHICLE:['รถ','Vehicle'],
 READY:['พร้อมใช้งาน · ยืนยันแล้ว','Ready · confirmed'], PROPOSED:['เสนอเช่า · ยังไม่ยืนยัน','Proposed hire · unconfirmed'], UNAVAILABLE:['ไม่พร้อมใช้งาน','Unavailable'],
 ACTIVE:['ใช้งาน','Active'], INACTIVE:['ไม่ใช้งาน','Inactive'],
 request:['ส่งคำขอจอง','Send booking request'], waitRequest:['ส่งคำขอให้ทีมตรวจสอบ','Ask the team to review'],
 waitConsent:['ฉันเข้าใจว่ายังไม่มีที่ครบทั้งกลุ่ม และคำขอนี้ยังไม่ใช่การยืนยันจอง','I understand that the full group is not accommodated yet and this request is not a confirmed booking.'],
 sent:['รับคำขอแล้ว · ยังไม่ยืนยัน Booking กรุณาติดตามสถานะในทริปของฉัน','Request received · Booking is not confirmed. Follow its status in My trips.'],
 hold:['กันที่ชั่วคราวถึง','Seats temporarily held until'], holdExpired:['การกันที่ชั่วคราวหมดอายุแล้ว ต้องตรวจที่ว่างใหม่ก่อนยืนยัน','The temporary seat hold expired. Availability must be checked again before confirmation.'],
 returnPending:['ยังไม่ทราบวันกลับ จึงยังไม่ได้กันที่นั่งขากลับ','Return date is unknown; return seats are not reserved.'],
 otherDate:['เลือกวันอื่น','Choose another date'], refresh:['ตรวจใหม่','Recheck'], review:['รอทีมพิจารณาเพิ่มเรือหรือเสนอวันอื่น','Team review: arrange extra boats or propose another date'],
 newWindow:['เพิ่มรอบความพร้อม','Add readiness window'], editWindow:['แก้ไขรอบความพร้อม','Edit readiness window'], save:['บันทึกความพร้อม','Save readiness'],
 verified:['นับเฉพาะรถ/เรือที่ยืนยันพร้อมในรอบนี้ เรือที่เสนอเช่ายังไม่นับ','Only confirmed ready vehicles count for this window. Proposed hires do not count.'],
 date:['วันให้บริการ','Service date'], start:['เวลาเริ่ม (ประเทศไทย)','Start (Thailand time)'], end:['เวลาสิ้นสุด (ประเทศไทย)','End (Thailand time)'],
 services:['บริการที่ใช้ความจุร่วมกัน','Services sharing this capacity'], addService:['เพิ่มบริการร่วม','Add shared service'], vehicles:['รถ/เรือในรอบนี้','Vehicles in this window'],
 addVehicle:['เพิ่มรถหรือเรือ','Add vehicle or boat'], usable:['ความจุลูกค้าที่ใช้ได้จริง','Usable passenger capacity'], ttl:['เวลากันที่ชั่วคราว (นาที)','Temporary seat hold (minutes)'],
 factor:['ตัวคูณสัมภาระลูกค้าค้างคืน','Overnight luggage factor'], ttlHint:['ระบุเวลาที่ทีมยอมรับก่อนเปิดรอบ ไม่ใช่โควตาโปรโมชั่น','Set the agreed hold duration before opening the window. This is not the promotion quota.'],
 plan:['แผนแนะนำ · ยังไม่ได้จัดงานจริง','Suggested plan · not an actual assignment'], total:['ลูกค้าที่กันความจุแล้ว','Reserved passengers'], held:['กันที่ชั่วคราว','Temporarily held'],
 boats:['เรือที่แนะนำ','Suggested boats'], spare:['ที่ว่างในชุดเรือที่แนะนำ','Spare seats in suggested boats'], unavailable:['ต้องจัดหาเพิ่มหรือปรึกษาทีม','More capacity or team review required'],
 whole:['กลุ่ม Booking','Booking groups'], fixed:['จัดเรือแล้ว','Boat already assigned'], empty:['ยังไม่มีรอบความพร้อมในวันนี้','No readiness windows for this day'],
 actual:['จำนวนลูกค้าจริง','Actual passengers'], weighted:['หน่วยความจุรวมสัมภาระ','Capacity units including luggage'], vanMinimum:['จำนวนรถที่ประเมิน','Estimated vehicles needed'],
 additional:['หน่วยความจุที่ต้องจัดหาเพิ่ม','Additional capacity units required'], vanHint:['เป็นการประเมินเบื้องต้น ต้องตรวจที่นั่งรายคัน จุดรับ เวลา เส้นทาง และสัมภาระก่อนจัดจริง','Preliminary estimate. Verify each vehicle’s seats, pickups, times, routes and luggage before assigning.'],
 shortage:['ความพร้อมลดลง ต้องให้ทีมทบทวน Booking ที่รับไว้ ไม่ได้ยกเลิกลูกค้าอัตโนมัติ','Readiness has decreased. Review committed Bookings; no customer booking was automatically cancelled.'],
 proposal:['ทีมเสนอวันเดินทางใหม่','The team proposes a new service date'], propose:['เสนอวันอื่นให้ลูกค้า','Propose another date'],
 proposalHint:['ยังไม่เปลี่ยนวันจนกว่าลูกค้าจะตอบตกลง และต้องตรวจที่ว่างอีกครั้ง','The date stays unchanged until the customer agrees. Availability will be checked again.'],
 acceptDate:['ยอมรับวันและราคาใหม่','Accept new date and price'], declineDate:['ไม่รับวันใหม่','Decline new date'],
 agreeDate:['ฉันตรวจวันใหม่ ราคา และเงื่อนไขแล้ว และยินยอมเปลี่ยนวันตามนี้','I have reviewed the new date, price and terms and agree to this change.'],
 proposalSent:['ส่งข้อเสนอวันใหม่แล้ว รอลูกค้าตอบตกลง','New date proposed. Awaiting the customer’s agreement.'],
 move:['ย้ายทั้ง Booking','Move whole Booking'], moveHint:['ย้ายทั้งกลุ่มในรายการเดียว หากที่ใหม่ไม่พอจะคงรายการเดิมไว้','Moves the entire group atomically. If the target cannot fit it, the original assignment is kept.'],
 target:['เที่ยวเรือปลายทาง','Target boat run'], reason:['เหตุผล','Reason'], selectionHint:['ไม่จองเรือลำจริงในขั้นนี้ การจัดงานจริงยังเปลี่ยนได้เมื่อทุกกลุ่มมีที่ครบ','This does not assign a specific boat. Dispatch remains flexible while every group is accommodated.'],
 CAPACITY_CHANGED:['ที่ว่างเปลี่ยนแล้ว กรุณาตรวจใหม่หรือเลือกส่งคำขอรอทีม','Availability changed. Recheck or explicitly send a request for team review.'],
 BOAT_CAPACITY_REVIEW_REQUIRED:['ความจุเรือยังไม่รองรับทั้งกลุ่ม กรุณาให้ทีมตรวจและยืนยันความพร้อม','Boat capacity does not accommodate the whole group. Team readiness review is required.'],
 BOOKING_GROUP_MUST_STAY_TOGETHER:['ห้ามแบ่ง Booking ลงเรือ ต้องจัดทั้งกลุ่มพร้อมกัน','Do not split this Booking across boats. Assign the whole group.'],
 BOOKING_GROUP_ALREADY_ASSIGNED:['Booking นี้มีการจัดเรือแล้ว ใช้การย้ายทั้ง Booking แทน','This Booking is already assigned. Use Move whole Booking instead.'],
 SELECT_SERVICE_WINDOW:['กรุณาเลือกรอบบริการก่อนยืนยัน','Select a service window before confirming.'],
 CAPACITY_NOT_CONFIGURED:['ยังไม่ได้ตั้งค่าความพร้อม ต้องให้ทีมตรวจสอบ','Readiness is not configured. Team review is required.'],
 CAPACITY_WINDOW_HAS_RESERVATIONS:['รอบนี้มีการกันที่แล้ว ไม่สามารถเปลี่ยนวัน เวลา หรือบริการได้','This window has reservations. Its date, times or services cannot be changed.'],
 CAPACITY_WINDOW_CONFLICT:['เที่ยวงานชนกับรอบที่กันความจุไว้','The run conflicts with a reserved service window.'],
 INVALID_CAPACITY_OFFERS:['ตรวจความจุและความพร้อมจริงของรถหรือเรือ','Check actual vehicle capacity and readiness.'],
};
export function capacityText(key,locale='en',params={}) {
 const text=copy[key]?.[locale==='th'?0:1]||key;
 return text.replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??''));
}
export function capacityLabel(key,locale='en') {const en=capacityText(key,'en'),th=capacityText(key,'th');return locale==='th'&&en!==th?`${th} / ${en}`:en}

Object.assign(copy,{
 bindLegacy:['ระบุรอบของ Booking เดิม','Record legacy Booking window'],
 bindLegacyHint:['ใช้เฉพาะ Booking ที่ยืนยันไว้เดิมแต่ยังไม่มีรอบบันทึกไว้ ไม่เปลี่ยนวัน ไม่จัดเรือ และไม่ยืนยัน Booking ใหม่ หากความจุยังไม่พอต้องให้ทีมจัดหาเพิ่ม','Only reconciles an already-confirmed Booking whose service window was not recorded. It does not change the date, assign a boat or confirm a new Booking. Capacity shortages still require team action.'],
 promotionQuota:['โควตาโปรโมชั่นคงเหลือ (ไม่ใช่ที่นั่งเรือ)','Remaining promotion quota (not boat availability)'],
 GROUP_SERVICE_QUANTITY_MISMATCH:['จำนวนบริการเรือไม่ครบทั้ง Booking ให้ตรวจรายการบริการก่อนยืนยัน','The boat-service quantity does not cover the entire Booking. Review its service lines before confirmation.'],
})

Object.assign(copy,{
 CAPACITY_JOURNEY_UNRESOLVED:['ยังไม่มีวันใช้บริการเรือที่ชัดเจน ให้แก้ไขข้อมูลการเดินทางก่อนยืนยัน','The boat journey date is not recorded. Resolve the journey before confirmation.'],
 CAPACITY_SELECTION_ALREADY_RECORDED:['Booking นี้บันทึกรอบไว้แล้ว ไม่สามารถใช้คำสั่งแก้รายการเดิมเปลี่ยนรอบได้','This Booking already has a recorded service window. Legacy reconciliation cannot replace it.'],
 INVALID_CAPACITY_SELECTION:['เลือกรอบบริการที่ตรงกับวันและขาที่จอง','Choose a service window matching the booked date and direction.'],
 INCOMPATIBLE_CAPACITY_SERVICES:['บริการในรอบเดียวกันต้องเป็นประเภทและเส้นทางที่จัดร่วมกันได้','Services sharing a readiness window must have compatible type and route.'],
 EXISTING_BOOKING_SPLIT:['พบ Booking เดิมถูกแยกหลายลำ ต้องให้ผู้รับผิดชอบแก้การจัดงานก่อน','An existing Booking is split across boats. The authorized planner must reconcile its assignments.'],
})
export const capacityErrorCodes=['BOAT_CAPACITY_REVIEW_REQUIRED','BOOKING_GROUP_MUST_STAY_TOGETHER','BOOKING_GROUP_ALREADY_ASSIGNED','CAPACITY_CHANGED','INVALID_CAPACITY_SELECTION','CAPACITY_WINDOW_HAS_RESERVATIONS','CAPACITY_WINDOW_CONFLICT','INVALID_CAPACITY_OFFERS','CAPACITY_JOURNEY_UNRESOLVED','GROUP_SERVICE_QUANTITY_MISMATCH','EXISTING_BOOKING_SPLIT','CAPACITY_SELECTION_ALREADY_RECORDED','INCOMPATIBLE_CAPACITY_SERVICES']
