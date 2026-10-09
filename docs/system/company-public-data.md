# Company public data

## เส้นทาง
Back Office Company settings → CompanySettings  
CompanyContactProvider → GET /api/public/company → publicCompany → safe public fields → contact strip และ CompanyLocation

ข้อความใน /about และ /contact-us อยู่ใน source แต่ข้อมูลติดต่อและแผนที่ใช้ reader ร่วม ไม่ควรคัดลอกค่าปัจจุบันไป hardcode ในบทความ

## ขอบเขตข้อมูล
Public projection ส่งชื่อ ที่อยู่ ช่องทางติดต่อ และแผนที่ที่ผ่านการตรวจค่า ไม่ส่งข้อมูลธนาคาร ภาษี หรือ metadata ภายใน ข้อมูลที่ไม่พร้อมต้องคงสถานะว่าง/ข้อผิดพลาดตาม UI ไม่เดาค่าติดต่อแทน

## ประกาศ
Popup อ่าน GET /api/public/popups → WebsitePopup จำกัด ACTIVE และช่วงวันปัจจุบัน เป็นข้อมูล Back Office แยกจากบทความ editorial

## หลักฐาน
- [Shared contact reader](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/company/CompanyContactProvider.jsx#L8-L25)
- [Public company and popup projections](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/modules/commerce/service.js#L56-L65)
- [API mapping](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/app/http.js#L99-L106)
- [Settings endpoints](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/app/http.js#L322-L328)
