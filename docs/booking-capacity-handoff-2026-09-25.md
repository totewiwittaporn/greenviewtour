# Booking capacity — owner decisions and handoff, 25 September 2026

> CURRENT STATUS: The owner subsequently authorized completion. The earlier pure-helper-only/P1-P4 backlog below is historical. Read [Booking capacity flow](booking-capacity-flow.md) and the implementation continuation/validation sections at the end before starting new work. The remaining role Dashboards are the next product task.

## จุดเริ่มงานต่อ
เจ้าของ: ที · รีเซ็ตเครดิตตามที่แจ้ง: **27 กันยายน 2026 เวลา 17:24 น. Asia/Bangkok**.
พักงาน Dashboard และภาพออกแบบไว้ก่อน; ให้ Booking/availability ถูกต้องก่อน แล้วค่อยนำข้อมูลไปแสดงบนหน้าตาเดิม.
Local: `/Users/tootee/Documents/Projects/greenviewtour`, branch `mint/dashboard-redesign-2026-09-21`, HEAD `9af7fd7bc015a169ca529b25fc7693de57fee4f3`.
ตรวจ `git ls-remote` แล้ว branch บน GitHub ตรง HEAD นี้ แต่ Mac มีงานวันที่ 22–23 กันยายนที่ยังไม่ commit จำนวนมาก. ห้าม reset/pull ทับหรือเหมารวมงานเดิมใน commit ใหม่.

## กติกาที่ตกลงแล้ว — ใช้แทนการรวมยอดคนอย่างเดียว
- Booking ทุกช่องทางใช้ความจุชุดเดียว: Agent, เว็บไซต์ และพนักงาน. คำขอที่แปลงเป็น Booking แล้วห้ามนับซ้ำ.
- **หนึ่ง Booking ต้องอยู่เรือลำเดียวกันในแต่ละขา**; ห้ามตัดกลุ่มเพื่อให้ลงพอดี. ขาไป/กลับใช้คนละลำได้ แต่ทั้งกลุ่มต้องไปด้วยกันในแต่ละขา.
- คำนวณตามวันให้บริการ ขา รอบเวลา เส้นทาง และบริการที่ใช้จริง. ลูกค้าไม่ใช้รถไม่ถูกนับรถ; ค้างคืนนับขากลับตามวันกลับจริง. วันกลับยังไม่ทราบไม่ใช่มีที่นั่งกลับแล้ว.
- รับคำขอได้แม้เรือบริษัทเต็ม **แต่ยัง Confirm หรือเรียกเก็บเงินเสมือนรับจองแล้วไม่ได้**. ส่งคิวให้ทีมตัดสินใจเพิ่มเรือหรือเสนอวันอื่น; เปลี่ยนวันได้เมื่อลูกค้าตกลงและวันใหม่รองรับได้.
- เรือเช่านับเพิ่มเฉพาะวัน/รอบที่ยืนยันจัดหาและพร้อมใช้แล้ว ไม่รวมเพียงความตั้งใจจะเช่า. รถร่วม/รถเช่าก็ต้องยืนยันความพร้อมรายรอบ.
- Confirmed Booking ต้องกันความจุทั้งกลุ่ม แม้ยังไม่กำหนดลำจริง; การคำนวณแนะนำไม่ใช่การกันที่. Active holds ต้องมี TTL ที่ตกลง ไม่ถือ promotion quota hold เป็น boat-seat hold โดยอัตโนมัติ.
- พนักงานยังเลือกลำ/คันและจัดกัปตัน/คนขับเอง. เปลี่ยนแผนได้เมื่อทุก Booking ยังรองรับครบ; ห้าม solver ย้ายงานที่ยืนยันจัดไว้เงียบ ๆ.
- หน้าเว็บต้องบอกจำนวนที่เหลือและตรวจกลุ่มที่เลือก: เหลือ 1 จอง 2 ไม่ได้; ว่างแยก 3+2 ไม่ใช่ว่ารับกรุ๊ป 5 ได้. ให้เลือกวันอื่นหรือส่งคำขอรอตรวจ ไม่แจ้งว่าจองสำเร็จ.
- เป้าหมายแนะนำเบื้องต้น: กลุ่มลงได้ครบ → ใช้เรือน้อยลำที่สุด → ความจุส่วนเกินน้อยที่สุด. ยังไม่ใช่การ optimize ค่าใช้จ่าย.
- ตัวอย่างเรือ 30/45/65: กลุ่ม 30+40 ใช้ 30+45; กลุ่ม 35+35 ต้องใช้ 45+65; กลุ่มเดียว 65 ใช้ 65. จึงเลือกจากยอดรวม 70 อย่างเดียวไม่ได้.
- รถ: 1.0 หน่วย/คนไปเช้าเย็นกลับ และ 1.2 หน่วย/คนค้างคืนเป็นสมมติฐานเผื่อกระเป๋าที่ปรับได้. จำนวนคนจริงยังเป็นจำนวนเต็ม; ใช้ 10/12 หน่วยจำนวนเต็มภายในเพื่อลดปัญหาทศนิยม. **ไม่ใช้ 1.2 บนเรือ**.

## รอบเครดิตจำกัดนี้ทำอะไร
เพิ่ม pure `planBoatGroups` ใน `backend/src/modules/operations/boat-capacity-plan.js` และ unit tests `backend/test/boat-capacity-plan.test.js`.
เป็น solver สำหรับ **หนึ่ง pool ที่เข้ากันได้** ของเรือพร้อมใช้และกลุ่มผู้โดยสารที่ไม่แยก. ลดจำนวนลำก่อนแล้วลดความจุส่วนเกิน; ไม่อ่านฐานข้อมูล ไม่จองที่ ไม่เปลี่ยนสิทธิ์ ไม่เรียก API.
คืน FEASIBLE พร้อมหลักฐานการจัดกลุ่ม หรือ INSUFFICIENT_CAPACITY เมื่อพิสูจน์ว่าไม่ลง. ติดขีดจำกัดการค้นหาคืน REVIEW_REQUIRED แทนการเดาว่าเต็ม/ว่าง; มีแผนแล้วแต่ยังพิสูจน์ดีที่สุดไม่ได้จะระบุ `optimal: false`.
**ยังไม่เชื่อมกับ Confirm, dispatch, Public/Member หรือ payment. ระบบใช้งานจริงยังไม่ได้รับกติกาป้องกันใหม่จากไฟล์นี้.**

## ช่องว่างจากไฟล์จริงที่ต้องแก้ต่อ
- `operations/reservations.js:33–49`: `ensureBookingAvailability` ตรวจ trip/slot แต่ข้าม dispatch-category ที่ไม่มี slot. Modern booking มี trip envelope ของตัวเอง จึงยังไม่มี shared fleet/group feasibility gate.
- `operations/bookings.js`: `bookingStatus(CONFIRM)` เรียก availability หลังเปลี่ยนสถานะภายใน transaction; ใช้เป็นจุดรวมตรวจโดยไม่ทำลาย rollback/idempotency เดิม. ตรวจ `amendReturnJourney` และทุกเส้นทางแก้วัน/จำนวนด้วย.
- `commerce/service.js:145–164`: รับคำขอผ่าน ACCEPT → saveBooking → bookingStatus(CONFIRM). ต้องรับข้อผิดพลาดความจุ/คิวรอทีมและไม่ทิ้ง Booking ครึ่งรายการ. ตรวจ demo-checkout แยกด้วย ห้ามใช้ simulation ข้าม production guard.
- `operations/dispatch.js`: ปัจจุบัน ASSIGN รับจำนวนผู้ใหญ่/เด็กบางส่วนและตรวจเพียงยอดรวม. ต้องกันการ split ทั้ง Booking ข้ามหลาย component/เที่ยวในขาเดียว; ย้ายทั้งกลุ่มแบบ atomic และรักษากฎ stock/actual เดิม.
- `commerce/service.js` มี `holdUntil` สำหรับโควตาโปรโมชันอยู่แล้ว; ไม่ใช่หลักฐานการกันที่นั่งเรือ.
- Solver รอบนี้ไม่รู้วันที่ สิทธิ์ พร้อมใช้/ซ่อม charter เส้นทาง หรือ fixed assignments. Caller ต้องจัด pool จริงก่อน. ยัง **ไม่รองรับ pinned assignments** และยังไม่ประสานการใช้เรือลำเดียวข้ามหลาย pool เวลาเหลื่อม.

## ลำดับงานหลังรีเซ็ต
### P1 — ข้อมูลความพร้อมและตัวคำนวณกลาง [NEXT]
อ่าน schema, service-catalog, dispatch, booking-plan และ callers ก่อนกำหนด migration. โมเดลวัน/รอบพร้อมใช้กับ pool ที่แชร์เรือจริง; อย่าแยก quota ต่อโปรแกรมจนขายเรือลำเดียวทับกัน.
ใช้ความจุลูกค้าที่ใช้ได้จริงภายใต้ข้อจำกัดลูกเรือ/จำนวนคนรวม; แยกซ่อม ติดงาน และเรือเช่าที่ยังไม่ได้ยืนยัน. รวมทุก Booking/active hold ทั้งไปกลับโดย unique reservation identity.
เพิ่มการรองรับ assignment ที่ต้องตรึงและข้อจำกัด charter/ความเข้ากันได้. ไม่ตีความคำตอบจาก pool ที่จัดข้อมูลไม่ครบว่า confirmable.
### P2 — การกันที่และ Confirm ฝั่ง server [CRITICAL]
ใช้ transaction/locking ร่วมกันทุกช่องทางและทุกวันที่เกี่ยวข้อง (ลำดับ lock คงที่). ตรวจซ้ำ + กันที่ทุกขาแบบ all-or-nothing; retry/idempotency ต้องไม่กันซ้ำ.
กำหนด TTL holds, release/expire/cancel/เปลี่ยนวัน/เพิ่มวันกลับ, capacity revision และคิว “รอทีมยืนยันความพร้อม”. เรือไม่พอไม่ทำให้คำขอถูกลบหรือวันปิดขาย แต่ห้าม Confirm/เปิดชำระก่อนพร้อม.
ทดสอบพนักงานกับเว็บแย่งที่เดียวกันพร้อมกัน, request→Booking ไม่ซ้ำ, เปลี่ยนความจุหลังมี Confirmed, ย้ายวันล้มเหลวแล้วแผนเดิมยังอยู่. คงปัญหาที่แก้ไม่ได้เป็น review ไม่อ้างว่าทุกอย่างพร้อม.
### P3 — Public/Member และ Backoffice รับผลเดียวกัน [CRITICAL]
ก่อนกดจองแสดง remaining + canAcceptWholeGroup สำหรับวันที่/โปรแกรม/ขาที่เลือก. ข้อมูลหมดอายุต้องตรวจ server ซ้ำ; จำนวนรวมอย่างเดียวไม่รับประกัน. Public DTO ไม่เปิดชื่อ Booking/Agent/ผู้โดยสารหรือข้อมูลทีม.
กรณีไม่พอ: เลือกวันอื่นหรือส่งคำขอทีม; ไม่สร้าง QR/เรียกเก็บเงิน/ส่ง confirmed message. ตรวจอีกครั้งก่อน create payment และกำหนด late-payment/reconciliation ไม่ oversell.
### P4 — จัดเรือ/รถและคำนวณรถ
เพิ่มหน้าสรุป “แนะนำ / จัดแล้ว / ขาด / รอทีม” บน Core เดิม; การเสนอแผนไม่สร้าง dispatch อัตโนมัติ. ยืนยัน/ย้ายทั้ง Booking แล้วตรวจทุกกลุ่มยังลงได้.
รถใช้ตัวคูณกระเป๋าที่ตั้งค่าได้ ควบคู่ actual seats/เส้นทาง/จุดรับ/เวลา; ceil ยอดรวมเป็นเพียงขั้นต่ำ. ความเข้มกติกาไม่แยกกลุ่มบนรถให้ยืนยันเพิ่ม ไม่เหมาว่าทีสั่งเท่ากับเรือ.
### P5 — Dashboard/คู่มือและทดสอบ Preview
นำผลกลางไปหน้า Booking, GM, Head Guide และ Head Driver โดยใช้ UI ล่าสุดที่มีอยู่จริง ห้ามออกแบบใหม่หรือสร้างรูปใหม่. Update authenticated role manuals.
Head Captain เห็นงานเรือ/เที่ยวที่ตนถูกมอบหมายเท่านั้น ไม่ใช่ทั้งกองเรือ และไม่ผูกคนกับลำถาวร. หน้าที่ Sales ยังรอตกลง; ไม่เปิดสิทธิ์ customer request ให้เอง.
ก่อนเปิดใช้ร่วมกัน: regression ทั้งระบบ, browser+mobile, concurrency บน Preview ที่ตรวจ target แล้ว และทดสอบทั้งไป/กลับ/ข้ามวัน. ไม่ deploy Production ในรอบนี้.

## หลักฐานรอบนี้
- `node --test backend/test/boat-capacity-plan.test.js`: ผ่าน 9/9 tests; รวมเทียบ 200 ชุดข้อมูลสุ่มแบบ deterministic กับ exhaustive oracle แยกต่างหาก.
- Focused ESLint ของ 2 ไฟล์ใหม่ผ่าน. `npm run check` ผ่าน: backend 265 tests, frontend 29 tests, lint และ build ทั้ง Public/Backoffice/Member. Backoffice ยังมีคำเตือน bundle ใหญ่; ไม่ใช่งานของรอบนี้.
- ไม่มี runtime wiring หรือ UI change จึงไม่ได้รัน browser fixtures/บัญชีจริง/DB concurrency; ไม่อ้างว่าผ่าน live Booking. ไม่มี migration, seed, payment, LINE, deployment หรือเปลี่ยนข้อมูล DEMO.
- Log: `/tmp/greenview-booking-capacity-check-20260925.log`; ตรวจ hash งานเดิมกับ `/tmp/greenview-booking-capacity-before-20260925.json` ก่อนส่งมอบ.
- Scope รอบนี้: solver + tests + เอกสารนี้ (ไฟล์ใหม่) และเพิ่มลิงก์เดียวใน `docs/agent-context.md`. ยังไม่ commit/push; ทุกงานเก่าคงอยู่บนเครื่อง.

## Prompt สำหรับมิลค์/งานรอบถัดไป
อ่าน `docs/booking-capacity-handoff-2026-09-25.md` แล้วตรวจ Git/local source ล่าสุดก่อนลงมือ. ทำ P1 → P2 → P3 เป็นชุดกติกาเดียวให้ทุกช่องทางเห็น capacity จริง โดยห้าม split Booking ลงหลายลำและห้าม Confirm เมื่อยังหาเรือเพิ่มไม่สำเร็จ. Solver ที่มีเป็น pure helper ไม่ใช่ gate ที่เปิดใช้แล้ว; เพิ่มวันที่/รอบ/เรือพร้อมใช้, fixed allocations, holds และ atomic verification ก่อนต่อ public checkout. ไม่เริ่ม Dashboard ก่อนงานนี้ครบ ไม่เปลี่ยนดีไซน์ ไม่ทิ้งงาน uncommitted หรือ persistent DEMO ไม่แตะ Production. ยืนยันผ่าน tests + concurrency/role/browser checks บน Preview ที่ตรวจเป้าหมายแล้ว และ update เอกสารนี้พร้อมสถานะที่ทำจริง.

### Final audit notes
ชื่อฟังก์ชันแก้วันกลับที่มีจริงใน `operations/bookings.js` คือ **`amendBookingReturn`** (แก้ชื่ออ้างอิง `amendReturnJourney` ในรายการช่องว่างด้านบน).
ขั้นตอนเปรียบเทียบ hash งานเดิมรอบสุดท้ายยังไม่สำเร็จ: tool ปฏิเสธคำสั่งตรวจแบบรวมด้วยข้อความ “couldn't determine the safety status”. จึงไม่อ้างว่าการตรวจ hash รอบสุดท้ายผ่าน; ให้ตรวจ snapshot ที่บันทึกไว้ก่อนเริ่มงานต่อ. ผล unit/lint/build ข้างต้นเป็นคำสั่งก่อนหน้าที่รันสำเร็จจริง.

## Implementation continuation — owner authorized completion on 25 September 2026

This section supersedes the earlier pure-helper-only / P1–P4 pending status. Current behavior and setup instructions: [Booking capacity flow](booking-capacity-flow.md).

Implemented and connected locally:
- Three private readiness/offer/request-hold models and the verified Preview-only additive migration `20260925103000_booking_capacity`.
- Shared per-day/direction/window fleet feasibility across all Booking channels, timed whole-group holds, charter and pinned-assignment constraints, and the server CONFIRM gate.
- Explicit WAITING_TEAM requests and DRAFT capacity-review outcomes, actual rental-readiness changes, customer-consented date proposals and atomic request-to-Booking conversion.
- Public and Member remaining-seat/group-fit displays, explicit unconfirmed waiting consent, seat-hold expiry and payment-readiness presentation.
- The existing Backoffice now includes Vehicle & boat readiness, live Booking checks/window selection, customer request review, legacy missing-window reconciliation and atomic Move whole Booking.
- Configurable preliminary van luggage planning with integer passenger packing, actual seats, assumed extra-vehicle size and no automatic dispatch.
- Existing Core appearance/navigation retained. Per-role authenticated manuals updated. Head Captain visibility remains assignment-based; no new role grants or Sales scope were introduced.

Operational inputs, not invented test data: the team's real ready-vessel windows, usable capacities and hold duration must be configured before actual confirmation. Read-only Preview inspection found zero real readiness windows; this implementation deliberately returns review-required until those records are entered. Existing retained DEMO and real Booking records were not backfilled or rewritten.

The current customer payment flow remains the pre-existing manual/provider-simulation flow. Live QR provider selection/activation, automatic refunds, outbound LINE/email notifications and hosted deployment are separate release tasks, not claimed by this change.

Validation artifacts are under `/tmp/greenview-booking-full-20260925/`. The original working tree was preserved in `before/` and `manifest-before.json` before implementation. Baseline branch remains `mint/dashboard-redesign-2026-09-21`, HEAD `9af7fd7bc015a169ca529b25fc7693de57fee4f3`; both local and remote branch HEADs matched at task start. Earlier uncommitted work is retained, not attributed to this change.

Next product work is the remaining role Dashboards, reusing the actual current Core and consuming the same readiness/capacity results. Do not restart the old Dashboard design or regenerate mockups. Sales responsibility remains an owner decision. Real company setup and an owner walkthrough should precede production release.

## Final verification — connected implementation

- `npm run check` passed on the final source: lint, **278 backend tests**, **29 frontend tests**, and all three frontend builds. `git diff --check` passed.
- Full `node scripts/smoke-browser-fixtures.js` passed, including the new capacity UI suite. After the final filter-notice adjustment, the aggregate checks and the affected capacity browser suite passed again.
- Capacity browser checks cover actual rendered Public/Member/Backoffice at 1440px and 390px, English/Thai, original Core/logo, readiness editing, Boat → Vehicle → Boat response-shape safety, van luggage/extra-vehicle assumptions, remaining seats versus group fit, explicit waiting consent and customer-only date acceptance. No framework/page errors or unexplained console errors remained in this suite. Screenshots use fixture data, not real customer records.
- The verified Preview rollback integration passed **20 workflow scenarios**, including both successful and failed atomic whole-group moves, overnight return shortages, cancellation/expiry, conversion without duplicate demand and legacy-window reconciliation.
- The real concurrent Preview web-request/staff-confirmation test passed: for one available seat, the final run produced one active web hold and zero confirmed staff bookings; total occupancy stayed one. Exact-ID disposable fixtures were cleaned up; no retained DEMO records were changed.
- One earlier all-scenarios rollback test exceeded its 240-second test transaction budget. It rolled back; only that opt-in test budget was extended to 360 seconds. The complete rerun passed. Application timeouts were not raised.
- Existing Backoffice bundle-size, browser-mapping age and pg interactive-query deprecation warnings remain. No production-scale performance claim or live-account browser end-to-end sign-in is made.
- Read-only table-security verification confirmed RLS enabled and no anon/authenticated SELECT privileges on CapacityPool, CapacityOffer and CapacityHold. Real readiness windows remain zero: actual fleet/date/hold-duration setup is required before live confirmation.
- Local development services are running: Public 5173, Backoffice 5174, Member 5175, API 5001. All three frontends and the actual public catalog API returned HTTP 200; unauthenticated staff session access returned 401 as expected.
- Source remains local/uncommitted on the existing branch. No GitHub push, hosted Preview deployment, Production change, real payment, outbound LINE/email or Auth-account mutation was performed.
- Logs: `check-complete.log`, `browser-complete.log`, `capacity-ui-final.log`, `integration-release.log`, `concurrency-release.log`, and `dev.log` under `/tmp/greenview-booking-full-20260925/`.
