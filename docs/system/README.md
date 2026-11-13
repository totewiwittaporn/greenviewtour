# คู่มือระบบข้อมูลเว็บไซต์ Greenview Tour

สถานะ: ฉบับร่างจาก source ที่ตรวจแล้ว วันที่ 9 ตุลาคม 2026

คู่มือนี้ระบุแหล่งข้อมูล จุดแก้ไข และจุดแสดงของ Public content โปรแกรมทัวร์ ข้อมูลบริษัท ภาษา และ SEO เท่านั้น ไม่ใช่คู่มือหรือผลตรวจครบทั้ง GVT

## ข้อสรุป
บทความทั่วไปเป็น TH/EN ในโค้ด ส่วนโปรแกรมทัวร์มี Back Office editor และข้อมูลแยกภาษาในฐานข้อมูลแล้ว ข้อมูลบริษัทใช้ CompanySettings อย่าคัดลอกราคา ที่ว่าง ตารางเดินเรือ หรือเบอร์ติดต่อไปตรึงไว้ในบทความ

## ดัชนี
- [Public content](public-content.md): Information hub และบทความ
- [Tour catalogue](tour-catalog.md): การแก้ไข เผยแพร่ API และตาราง
- [Company public data](company-public-data.md): ข้อมูลติดต่อและขอบเขตเปิดเผย
- [Language and SEO](public-language-seo.md): ภาษา metadata URL และ hosting
- [Verification log](verification-log.md): หลักฐาน ข้อจำกัด และวิธีอัปเดตคู่มือ

## ฐานอ้างอิง
Repository: totewiwittaporn/greenviewtour  
สาขาที่ตรวจ: main  
Commit: 1e806a24e5bc7fbcec38042bddb3b05968d01d97  
[เปิด commit](https://github.com/totewiwittaporn/greenviewtour/commit/1e806a24e5bc7fbcec38042bddb3b05968d01d97)

ยังไม่ยืนยันว่า source ตรงกับ Cloudflare Production หรือไฟล์บนเครื่องเจ้าของ งานบางส่วนอาจพักไว้และยังไม่ deploy ความต่างไม่ถือเป็นข้อผิดพลาดโดยอัตโนมัติ เอกสารนี้ไม่อนุญาตให้ deploy

กฎด้าน domain และ workflow ยังคงอ้างอิง [context routes](../agent-context.md), [workflow](../agent-workflow.md) และ [deployment boundary](../deployment.md) ไม่คัดลอกเอกสารประวัติเป็นหลักฐานว่าระบบปัจจุบันทดสอบผ่านแล้ว

## วิธีเริ่มงานครั้งต่อไป
1. อ่านหน้าย่อยที่เกี่ยวข้องและ commit ที่คู่มือตรวจไว้
2. เปรียบเทียบ changed files กับ commit เป้าหมาย แล้วอ่าน implementation, caller, API, schema และ test เฉพาะส่วนที่เปลี่ยน
3. หากเปลี่ยน owner, endpoint, field, filter หรือจุดแสดง ให้อัปเดตคู่มือในงานเดียวกัน
4. แยกหลักฐาน source, Local และ Production ระบุวันที่และ commit ของแต่ละส่วน
5. บันทึกสิ่งที่ยังไม่รู้ ไม่ถือว่าไม่มีข้อมูลเพราะ source ไม่ตอบคำถามเรื่อง Production

## Environment ตามคำยืนยันเจ้าของ
ใช้ Local สำหรับพัฒนาและทดสอบ, Production สำหรับใช้งานจริง และไม่ใช้ hosted Preview คู่มือนี้เผยแพร่บน GitHub เท่านั้น ไม่ใช่งาน Cloudflare deployment และไม่ได้ยืนยันสถานะการ deploy ของเครื่องหรือระบบจริง
