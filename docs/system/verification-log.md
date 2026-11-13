# Verification log

## 9 ตุลาคม 2026
Source baseline: 1e806a24e5bc7fbcec38042bddb3b05968d01d97, main, merge PR #29 วันที่ 7 ตุลาคม 2026

ตรวจอ่าน GitHub source/docs ของ Public articles, catalogue, company API, localization, metadata, schema และ route/runtime ที่เกี่ยวข้อง ไม่มีการเข้า account อ่านฐานข้อมูลจริง รัน test แก้ code หรือ deploy

## สิ่งที่ยังไม่ยืนยัน
| คำถาม | หลักฐานที่ต้องใช้ |
| --- | --- |
| Production ตรงกับ commit ใด | release/build identity และ routing config จริง |
| programme จริงและ TH/EN ครบหรือไม่ | exact public query และ read-only staff record เมื่อได้รับอนุญาต |
| Article CMS ต้องมีหรือไม่ | การตัดสินใจจากเจ้าของ |
| robots sitemap status canonical hreflang จริง | raw HTTP/header/head กับ rendered page |
| URL เดิมและ performance | inventory ครบและ GSC/analytics ที่เข้าถึงได้ |

GitHub releases list ที่อ่านว่าง ส่วน deployments endpoint ไม่รองรับผ่านเส้นทางที่ใช้ จึงไม่ยืนยัน Production SHA เจ้าของระบุว่างานบางส่วนอาจพักไว้และยังไม่ deploy

## การเผยแพร่คู่มือบน GitHub
ตรวจ source automation เพิ่มเพื่อแยกจาก Cloudflare deployment:
- workflow ที่พบคือ .github/workflows/ci.yml: push เฉพาะ main และ pull_request
- workflow ทำ npm ci, check, Playwright และ browser fixtures ไม่มี deploy step
- cloudflare:check เรียก local bundle ซึ่งใช้ wrangler deploy --dry-run; wrapper กรอง provider credentials และใช้ local config
- Production configs ที่ตรวจเป็น example และ disabled ไม่ใช่หลักฐาน config ที่ใช้งานจริง
- เจ้าของยืนยันว่า Preview ถูกตัดออกและไม่ใช้งานแล้ว และใช้ Local สำหรับพัฒนา จึงอนุมัติให้เผยแพร่คู่มือแบบ docs-only branch + Draft PR บน GitHub
- คำยืนยันนี้ไม่ใช่การตรวจ dashboard Cloudflare หรือการยืนยัน deployed SHA

ขอบเขตเผยแพร่คือเอกสารใน docs/system เท่านั้น ไม่แก้ workflow ไม่ merge main และไม่ deploy ไป Cloudflare

## วิธีบันทึกการตรวจครั้งต่อไป
ระบุวันที่ ผู้รับผิดชอบ ขอบเขต commit ก่อน/หลัง changed files หลักฐาน และสิ่งที่ไม่ได้ตรวจ แยก source verification, Local test, Production observation ห้ามนำผลเก่ามาเป็นผลปัจจุบันโดยไม่มีหลักฐาน

เมื่อ implementation เปลี่ยน ให้แก้คู่มือที่เกี่ยวข้องและเช็กลิงก์ในงานเดียวกัน การเริ่มงานใหม่ไม่จำเป็นต้อง audit ทั้งระบบ แต่ต้องขยายขอบเขตเมื่อ dependency หรือ owner เปลี่ยน

## หลักฐาน automation
- [CI](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/.github/workflows/ci.yml)
- [Package scripts](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/package.json)
- [Local wrapper](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/scripts/local-cloudflare.js), [Local policy](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/scripts/local-cloudflare-policy.js)
- [Deployment boundary](https://github.com/totewiwittaporn/greenviewtour/blob/1e806a24e5bc7fbcec38042bddb3b05968d01d97/docs/deployment.md)
