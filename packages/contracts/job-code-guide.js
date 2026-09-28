// One reference for the screen-only Codes dialog and authenticated role guides.
export const jobCodeGuide = [
 {en:'Accommodation',th:'ที่พัก',rows:[
  ['GV','Greenview tent','เต็นท์กรีนวิว'],['CT','Customer tent','เต็นท์ลูกค้า'],['NP','National park tent','เต็นท์อุทยาน'],['T-EXT','External-provider tent','เต็นท์ผู้ให้บริการอื่น'],
  ['BUN','Booked bungalow','บ้านพักที่จองผ่านรายการบริการ'],['B-OWN','Customer-arranged bungalow','ลูกค้าจัดหาบ้านพักเอง'],['STAY?','Accommodation type not confirmed','ยังไม่ยืนยันประเภทที่พัก'],
 ]},
 {en:'Meals',th:'อาหาร',rows:[
  ['B / L / D','Breakfast / lunch / dinner','อาหารเช้า / กลางวัน / เย็น'],['1:L / 2:B','Day 1 lunch / Day 2 breakfast','วันที่ 1 อาหารกลางวัน / วันที่ 2 อาหารเช้า'],['SELF','Explicitly self-catered; no included meals','ลูกค้าจัดหาอาหารเอง ไม่รวมอาหาร'],
 ]},
 {en:'Requests and status',th:'ความต้องการและสถานะ',rows:[
  ['VGN','Vegan','วีแกน'],['VEG','Vegetarian','มังสวิรัติ'],['NO-PARK','Park fee excluded','ไม่รวมค่าธรรมเนียมอุทยาน'],['NO-TRF','Transfer excluded','ไม่รวมรถรับส่ง'],
  ['A / C / Pax','Adults / children / passengers','ผู้ใหญ่ / เด็ก / ผู้โดยสาร'],['-','Not included in the recorded services','ไม่รวมในบริการที่บันทึกไว้'],['?','Unknown: confirm before service','ยังไม่ทราบ ต้องยืนยันก่อนให้บริการ'],
  ['ALLERGY / ASSIST','Read the full printed instruction, not a code-only substitute','อ่านข้อความข้อควรระวังหรือความช่วยเหลือบนใบงานให้ครบ ไม่ใช้รหัสแทนรายละเอียด'],
 ]},
]
export function jobCodeManualSections() {
 return [{heading:{en:'Job Order · reading and printing',th:'Job Order · การอ่านและพิมพ์'},body:{en:'The boat Job Order opens as full A4 portrait pages fitted to the dialog width. Scroll vertically. Use Codes for this reference; it is not printed on every job. Program codes come from Settings. Missing or ambiguous codes use the full program name. Passenger counts stay separate by direction. Long instructions continue on extra pages, never disappear.',th:'ใบงานเรือแสดงเอกสาร A4 แนวตั้งครบความกว้างในหน้าต่าง เลื่อนขึ้นลงเพื่ออ่าน กด Codes เพื่ออ่านรหัสอ้างอิง ซึ่งไม่พิมพ์ซ้ำทุกใบ รหัสโปรแกรมมาจากตั้งค่า หากไม่ตั้งหรือซ้ำจนแยกไม่ได้จะใช้ชื่อเต็ม นับผู้โดยสารแยกขาไปและขากลับ ข้อควรระวังยาวต่อหน้าเพิ่ม ไม่ตัดทิ้ง'}},...jobCodeGuide.map(group=>({heading:{en:`Job Order codes · ${group.en}`,th:`รหัสใบงาน · ${group.th}`},body:{en:group.rows.map(([code,en])=>`${code} = ${en}`).join('\n'),th:group.rows.map(([code,,th])=>`${code} = ${th}`).join('\n')}}))]
}
