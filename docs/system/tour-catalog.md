# Tour catalogue

## ข้อมูลหลัก
| ข้อมูล | Owner | จุดแสดง |
| --- | --- | --- |
| ตัวตน programme ราคา status slug | TourProgram | /tours และ /tours?tour=<slug> |
| ชื่อ สรุป เนื้อหา SEO แยกภาษา | TourProgramContent | card และ detail ตาม public projection |
| ไฮไลต์และ itinerary | TourHighlight, TourItineraryStep | detail |
| FAQ รายโปรแกรม | TourFaq | detail ไม่ใช่ /faq |
| รูป alt caption | TourMedia | card hero และ detail |
| featured order badge | TourProgram | featured programmes หน้าแรก |
| ช่วงบริการและ promotion | TourSeason, TourPromotion | detail และ promotion ตามเงื่อนไข |

## อ่านข้อมูล
TourList → GET /api/public/tours?view=cards&ownership=GREENVIEW → publicCatalog  
TourDetail → GET /api/public/tours?slug=…&view=detail → publicCatalog  
PublishedHighlights → API เดียวกัน พร้อม view=highlights&pageSize=3&featuredOnly=true

ต้อง status=ACTIVE และ publicStatus=PUBLISHED ก่อนส่งออก ค่าเริ่มต้นหน้า catalogue กรอง GREENVIEW; ownership และ duration เปลี่ยนผลได้ หน้าแรกยังต้อง homeFeatured ส่วน child rows จำกัด ACTIVE ตาม projection

Public API เลือก fields อย่างชัดเจน ไม่ส่ง supplier cost, Agent rates หรือข้อมูล partner ภายใน

## แก้ไขและบันทึก
Back Office /settings/tours/<id> → GET หรือ save /api/settings/tours/<uuid>/editor  
Staff authentication → authorizeCatalog → validate → transaction → TourProgram + TH/EN content + child collections → audit event

Editor มี Overview, Public content, Package & availability, Itinerary, Terms, Media, FAQ, SEO & publish มี DRAFT/PUBLISHED, slug, Home feature/order/badge และ SEO title, meta description, OG title/description ของแต่ละภาษา

TourProgramContent มี unique tourId+locale รายการ readiness ใน UI ไม่ใช่หลักฐานว่าข้อมูลจริงครบหรือเป็น approval workflow แยก

Cloudflare source ใช้ D1 ผ่าน env.DB และ files ผ่าน env.FILES ข้อมูลจริง binding และ migration ของ Production ยังไม่ตรวจ

## เมื่อหน้า catalogue ว่าง
ข้อความไม่มีทัวร์เผยแพร่เกิดเมื่อ response สำเร็จแต่ rows ว่าง แยกจาก error จึงไม่พิสูจน์ว่าไม่มีทัวร์ทั้งหมด ไม่มีทัวร์พันธมิตร หรือ editor เสีย ต้องตรวจ query และสถานะจริง ห้ามสร้าง sample หรือ publish programme โดยอ้างงาน SEO นี้

## หลักฐาน
- [Catalogue](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/catalog/Catalog.jsx#L22-L51), [Detail](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/catalog/TourDetail.jsx#L26-L55)
- [Public query and projection](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/modules/commerce/service.js#L23-L54)
- [Home query](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/public-web/src/features/catalog/PublishedHighlights.jsx#L7-L20)
- [Editor](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/frontend/backoffice/src/features/settings/tours/TourProgramEditor.jsx#L19-L162)
- [Authenticated routes](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/app/http.js#L314-L328)
- [Save transaction](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/modules/service-catalog/tour-editor.js#L17-L65)
- [Schema](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/prisma-d1/schema.prisma#L222-L392), [D1 binding](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/backend/src/cloudflare/api.ts#L18-L40)
