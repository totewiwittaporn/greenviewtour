# Public content

## เจ้าของข้อมูลและจุดแสดง
| หน้า | แหล่งหลัก | วิธีแสดง |
| --- | --- | --- |
| /information | publicRoutes.js | InformationPage สร้างการ์ด 5 หน้าจากชื่อและ description |
| /surin-islands | surin.js | ContentPage แสดง sections TH/EN |
| /surin-islands/travel-guide | travel-guide.js | ContentPage แสดง sections TH/EN |
| /faq | faq.js | FAQ ทั่วไป 8 ข้อ แยกจาก FAQ รายโปรแกรม |
| /about | about.js | เนื้อหาแนะนำบริษัทใน source |
| /contact-us | contact.js และ CompanySettings | ข้อความใน source; contact/map อ่าน API บริษัท |

## เส้นทางข้อมูล
หน้าเว็บ → ContentPage → contentPages → ไฟล์เนื้อหา  
ชื่อหน้าและคำอธิบาย → publicRoutes.js  
ภาพ editorial → static public assets  
รายละเอียดติดต่อ → shared CompanyContactProvider → API บริษัท

ไม่พบ article CRUD หรือ article-list API ในเส้นทางนี้ จึงไม่ใช่ Back Office Article CMS การแก้บทความปัจจุบันเป็นการแก้ source และเผยแพร่ตามขั้นตอนที่ได้รับอนุญาต

## ขอบเขตการเขียนเนื้อหา
- เก็บข้อมูลทั่วไป แหล่งอ้างอิง และวันตรวจเนื้อหาได้
- ราคาทัวร์ ที่ว่าง รายการรวม เบอร์ติดต่อ และเงื่อนไขปัจจุบันต้องอ้างอิง owner เดิม ไม่สร้างสำเนาคงที่
- ต้องให้เจ้าของตัดสินใจว่าบทความใหม่จะเป็น source-authored ต่อ หรือมี CMS ก่อนกำหนดวิธีบันทึกใหม่
- ยังไม่ตัดสินใจย้าย ลบ หรือ redirect URL เก่าจากข้อมูลที่ไม่ครบ

## หลักฐาน
- [Hub](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/content/InformationPage.jsx#L1-L23)
- [Routes](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/core/publicRoutes.js#L1-L13)
- [Article registry](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/content/pages.js)
- [Renderer](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/content/ContentPage.jsx#L8-L43)
- [Surin](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/content/surin.js), [Travel guide](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/content/travel-guide.js), [FAQ](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/content/faq.js)
