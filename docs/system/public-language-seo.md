# Public language and SEO

## ภาษา
LocaleProvider อ่าน localStorage greenview.locale ค่าเริ่มต้น TH และปรับ html lang ใน browser ทั้ง TH/EN ใช้ path เดียวกันใน route map ที่ตรวจ

บทความมี TH/EN ใน JS; programmes มี TourProgramContent แยกภาษา พร้อม fallback ไป locale หรือ base field ที่มีอยู่ การเลือก EN ไม่ได้พิสูจน์ว่าทุกช่องแปลครบ

## Metadata
- Editorial App useEffect กำหนด title และ description ใน browser
- TourDetail กำหนด title, description และ OG title/description หลังอ่าน API
- index.html เป็น React shell พร้อม Thai lang และ title เริ่มต้น
- ไม่พบ canonical, hreflang หรือ structured-data generation ใน route, App, ContentPage, TourDetail และ HTML shell ที่ตรวจ ไม่ใช่การตรวจทุก deployment rule

## Robots sitemap และ routing
ไม่พบ Public robots.txt หรือ sitemap artifact ใน repository tree ที่ตรวจ robots.txt ที่มีเป็นของ Back Office และ Member

Public Worker ส่ง non-API ไป ASSETS; config ตัวอย่างใช้ single-page-application not-found handling และ App fallback ไป Home เมื่อไม่ใช่ route ที่รู้จัก การเห็น Home เมื่อเปิด robots/sitemap สอดคล้องกับ source แต่ยังไม่ยืนยัน live HTTP status, content type, redirect หรือ deployed config

ก่อนสร้าง implementation ticket ให้ตรวจ raw HTTP/head เทียบ rendered head และยืนยัน build ที่ deploy จริง ความต่างจาก main ไม่ใช่ bug โดยอัตโนมัติ

## หลักฐาน
- [Locale](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/core/Locale.jsx#L5-L28), [Tour fallback](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/catalog/tourPresentation.js#L1-L51)
- [App](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/app/App.jsx#L14-L35), [Tour metadata](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/catalog/TourDetail.jsx#L26-L55)
- [HTML shell](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/index.html)
- [Worker](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/cloudflare/public-worker.js#L15-L42), [Example config](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/wrangler.public.production.jsonc.example#L17-L22)
- [Historical editorial scope](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/docs/public-content-2026-09-28.md)
