// Isolated content/read-only UI fixtures; no real company, booking, payment or Auth writes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {chromium} from 'playwright'
const origin = process.env.GREENVIEW_PUBLIC_ORIGIN || 'http://localhost:5173'
const evidence = process.env.GREENVIEW_CONTENT_EVIDENCE || join(tmpdir(), 'greenview-public-content-20260928')
// Explicit reviewed route, metadata, source and related-link expectations.
const expectedArticles = {
  "/about": {"title":{"th":"รู้จักกรีนวิว ทัวร์","en":"About Greenview Tour"},"description":{"th":"รู้จักกรีนวิว ทัวร์ เริ่มต้นทริปหมู่เกาะสุรินทร์จากคุระบุรี จังหวัดพังงา พร้อมข้อมูลสำหรับเลือกโปรแกรมและติดต่อทีมงาน","en":"Meet Greenview Tour. Plan your Surin Islands trip from Khura Buri, Phang Nga, explore programmes and contact the team."}},
  "/surin-islands": {"title":{"th":"รู้จักหมู่เกาะสุรินทร์ก่อนเดินทาง","en":"Surin Islands: a first-time guide"},"description":{"th":"รู้จักหมู่เกาะสุรินทร์ในจังหวัดพังงา จุดเด่นของการเที่ยวทะเล และสิ่งที่ควรตัดสินใจก่อนวางแผนเดินทาง","en":"Get oriented to the Surin Islands in Phang Nga, their marine setting and the decisions to make before planning a visit."},"relatedPaths":["/surin-islands/getting-there","/surin-islands/how-many-days","/surin-islands/travel-guide"],"sources":[{"url":"https://www.tourismthailand.org/Articles/mu-koh-surin-the-tropical-paradise-in-andaman","label":{"th":"การท่องเที่ยวแห่งประเทศไทย: หมู่เกาะสุรินทร์ (9 มกราคม 2020)","en":"Tourism Authority of Thailand: Mu Koh Surin (9 January 2020)"}}]},
  "/surin-islands/getting-there": {"title":{"th":"ไปหมู่เกาะสุรินทร์อย่างไร","en":"How to get to the Surin Islands"},"description":{"th":"วางแผนการเดินทางไปหมู่เกาะสุรินทร์โดยแยกช่วงเดินทางบนฝั่งกับเรือ พร้อมตรวจจุดรับและแผนขากลับ","en":"Plan the mainland and boat legs separately, confirm your pickup and departure points, and leave room for the return journey."},"relatedPaths":["/surin-islands/piers","/surin-islands/weather","/surin-islands/costs"],"sources":[{"url":"https://www.tourismthailand.org/Articles/mu-koh-surin-the-tropical-paradise-in-andaman","label":{"th":"การท่องเที่ยวแห่งประเทศไทย: หมู่เกาะสุรินทร์ (9 มกราคม 2020)","en":"Tourism Authority of Thailand: Mu Koh Surin (9 January 2020)"}}]},
  "/surin-islands/piers": {"title":{"th":"เตรียมตัวที่ท่าเรือไปหมู่เกาะสุรินทร์","en":"Surin Islands departure and check-in checklist"},"description":{"th":"ตรวจท่าเรือ จุดนัดพบ ที่จอดรถ และสัมภาระก่อนออกเดินทาง เพื่อให้วันขึ้นเรือไปหมู่เกาะสุรินทร์ราบรื่น","en":"Confirm the exact pier, meeting point, parking arrangements and luggage plan before your Surin Islands departure."},"relatedPaths":["/surin-islands/getting-there","/surin-islands/travel-guide"],"sources":[{"url":"https://dan.org/safety-prevention/diver-safety/psa/safe-boating-guidelines/","label":{"th":"Divers Alert Network: แนวทางความปลอดภัยบนเรือ","en":"Divers Alert Network: Safe boating guidelines"}}]},
  "/surin-islands/best-time": {"title":{"th":"เลือกวันเที่ยวหมู่เกาะสุรินทร์อย่างไร","en":"Choosing dates for a Surin Islands visit"},"description":{"th":"เลือกวันเที่ยวหมู่เกาะสุรินทร์โดยดูประกาศเปิดพื้นที่ควบคู่กับสภาพทะเล และแยกฤดูท่องเที่ยวออกจากพยากรณ์รายวัน","en":"Choose travel dates using official access notices and sea conditions, while keeping seasonal patterns separate from daily forecasts."},"relatedPaths":["/surin-islands/weather","/surin-islands/how-many-days"],"sources":[{"url":"https://news.dnp.go.th/news/11129","label":{"th":"กรมอุทยานฯ: ประกาศย้อนหลัง 26 ธันวาคม 2021 — ไม่ใช่ข้อมูลเปิดพื้นที่ปัจจุบัน","en":"DNP: historical notice, 26 December 2021 — not current access information"}},{"url":"https://tmd.go.th/weather/region/southernwestcoast","label":{"th":"กรมอุตุนิยมวิทยา: พยากรณ์ภาคใต้ฝั่งตะวันตก","en":"Thai Meteorological Department: southern west coast forecast"}}]},
  "/surin-islands/weather": {"title":{"th":"อ่านอากาศและคลื่นลมก่อนเที่ยวสุรินทร์","en":"Surin Islands weather and sea conditions"},"description":{"th":"อ่านพยากรณ์ทะเลก่อนเที่ยวหมู่เกาะสุรินทร์ ตรวจเวลาที่ออกประกาศ และเตรียมแผนเมื่อเรือหรือกิจกรรมเปลี่ยน","en":"Read marine forecasts, check when warnings were issued, and prepare for changes to your crossing or island activities."},"relatedPaths":["/surin-islands/best-time","/surin-islands/getting-there"],"sources":[{"url":"https://tmd.go.th/weather/region/southernwestcoast","label":{"th":"กรมอุตุนิยมวิทยา: พยากรณ์ภาคใต้ฝั่งตะวันตก","en":"Thai Meteorological Department: southern west coast forecast"}}]},
  "/surin-islands/how-many-days": {"title":{"th":"เที่ยวสุรินทร์กี่วันดี","en":"Surin Islands: day trip or overnight?"},"description":{"th":"เปรียบเทียบเที่ยวสุรินทร์แบบไปเช้าเย็นกลับกับค้างคืนจากเวลาเดินทาง ความสบาย และเวลาพักที่ต้องการ","en":"Compare a Surin day trip with an overnight stay using travel time, comfort and the amount of unhurried time you want."},"relatedPaths":["/surin-islands/accommodation","/surin-islands/facilities","/surin-islands/costs"],"sources":[{"url":"https://www.tourismthailand.org/Articles/mu-koh-surin-the-tropical-paradise-in-andaman","label":{"th":"การท่องเที่ยวแห่งประเทศไทย: หมู่เกาะสุรินทร์ (9 มกราคม 2020)","en":"Tourism Authority of Thailand: Mu Koh Surin (9 January 2020)"}}]},
  "/surin-islands/costs": {"title":{"th":"วางงบเที่ยวหมู่เกาะสุรินทร์","en":"Budgeting for a Surin Islands trip"},"description":{"th":"แยกค่าเดินทาง ค่าเข้าพื้นที่ ที่พัก อาหาร และอุปกรณ์ก่อนเปรียบเทียบงบเที่ยวหมู่เกาะสุรินทร์","en":"Separate transport, entry, accommodation, meals and equipment costs before comparing the total budget for a Surin visit."},"relatedPaths":["/surin-islands/how-many-days","/surin-islands/accommodation"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}}]},
  "/surin-islands/accommodation": {"title":{"th":"เต็นท์และที่พักบนหมู่เกาะสุรินทร์","en":"Surin Islands camping and accommodation"},"description":{"th":"ทำความเข้าใจโซนพักบนหมู่เกาะสุรินทร์ และคำถามเรื่องที่นอน ห้องน้ำ อาหาร และเรือที่ควรตรวจให้ครบ","en":"Understand the park’s accommodation areas and what to confirm about bedding, bathrooms, meals and boat connections."},"relatedPaths":["/surin-islands/facilities","/surin-islands/travel-guide","/surin-islands/how-many-days"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}}]},
  "/surin-islands/facilities": {"title":{"th":"ห้องน้ำ ไฟฟ้า และการติดต่อบนเกาะสุรินทร์","en":"Surin Islands facilities: what to check"},"description":{"th":"เตรียมเรื่องห้องน้ำ น้ำดื่ม ชาร์จไฟ สัญญาณโทรศัพท์ และการจ่ายเงิน โดยตรวจตามจุดพักจริงบนหมู่เกาะสุรินทร์","en":"Prepare for bathrooms, drinking water, charging, phone connectivity and payment arrangements at your actual island stop."},"relatedPaths":["/surin-islands/accommodation","/surin-islands/travel-guide"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}}]},
  "/surin-islands/snorkeling": {"title":{"th":"เลือกจุดดำน้ำตื้นหมู่เกาะสุรินทร์","en":"Choosing Surin Islands snorkeling sites"},"description":{"th":"รู้จักการเลือกจุดดำน้ำตื้นหมู่เกาะสุรินทร์จากสภาพน้ำ จุดขึ้นลง และความพร้อม แทนการยึดรายชื่ออ่าวตายตัว","en":"Choose snorkeling stops by conditions, entry and exit arrangements, and ability rather than expecting a fixed list of bays."},"relatedPaths":["/surin-islands/beginner-snorkeling","/surin-islands/marine-life","/surin-islands/responsible-travel"],"sources":[{"url":"https://www.tourismthailand.org/Articles/mu-koh-surin-the-tropical-paradise-in-andaman","label":{"th":"การท่องเที่ยวแห่งประเทศไทย: หมู่เกาะสุรินทร์ (9 มกราคม 2020)","en":"Tourism Authority of Thailand: Mu Koh Surin (9 January 2020)"}},{"url":"https://dan.org/health-medicine/travelers-medical-guide/travel-related-injuries/water-related-injuries-snorkeling-and-scuba-diving/","label":{"th":"Divers Alert Network: การดำน้ำตื้นและดำน้ำลึก","en":"Divers Alert Network: Snorkeling and scuba diving"}}]},
  "/surin-islands/beginner-snorkeling": {"title":{"th":"ดำน้ำตื้นสุรินทร์สำหรับมือใหม่","en":"Surin snorkeling for beginners"},"description":{"th":"เตรียมตัวดำน้ำตื้นครั้งแรกที่หมู่เกาะสุรินทร์ ตั้งแต่แจ้งทักษะการว่ายน้ำ ทดลองอุปกรณ์ ไปจนถึงเลือกข้ามกิจกรรม","en":"Prepare for a first snorkel by explaining your swimming ability, getting help with equipment and knowing when to sit out."},"relatedPaths":["/surin-islands/snorkeling","/surin-islands/with-children"],"sources":[{"url":"https://dan.org/health-medicine/travelers-medical-guide/travel-related-injuries/water-related-injuries-snorkeling-and-scuba-diving/","label":{"th":"Divers Alert Network: การดำน้ำตื้นและดำน้ำลึก","en":"Divers Alert Network: Snorkeling and scuba diving"}},{"url":"https://dan.org/safety-prevention/diver-safety/psa/safe-boating-guidelines/","label":{"th":"Divers Alert Network: แนวทางความปลอดภัยบนเรือ","en":"Divers Alert Network: Safe boating guidelines"}}]},
  "/surin-islands/marine-life": {"title":{"th":"สัตว์ทะเลที่อาจพบรอบหมู่เกาะสุรินทร์","en":"Marine life around the Surin Islands"},"description":{"th":"รู้จักกลุ่มปลาตามแนวปะการังรอบหมู่เกาะสุรินทร์ และวิธีสังเกตสัตว์ทะเลโดยไม่รบกวนหรือคาดหวังการพบแน่นอน","en":"Learn about reef fish recorded around Surin and how to observe marine life without disturbance or guaranteed-sighting expectations."},"relatedPaths":["/surin-islands/coral-reefs","/surin-islands/snorkeling","/surin-islands/responsible-travel"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}},{"url":"https://greenfins.net/wp-content/uploads/2022/05/22-04-20-New-Best-Environmental-Practice-for-Snorkeller-poster-LIVE.pdf","label":{"th":"Green Fins: ข่าวเผยแพร่แนวทางดำน้ำตื้นอย่างรับผิดชอบ (3 พฤษภาคม 2022)","en":"Green Fins: snorkeller environmental guidance press release (3 May 2022)"}}]},
  "/surin-islands/coral-reefs": {"title":{"th":"ทำความเข้าใจแนวปะการังสุรินทร์","en":"Understanding Surin’s coral reefs"},"description":{"th":"รู้ว่าปะการังเป็นสัตว์ เข้าใจความหมายของการฟอกขาว และแยกความรู้ทั่วไปออกจากสภาพแนวปะการังสุรินทร์ปัจจุบัน","en":"Understand coral as living animals, what bleaching means and why general reef knowledge cannot establish today’s Surin conditions."},"relatedPaths":["/surin-islands/marine-life","/surin-islands/responsible-travel"],"sources":[{"url":"https://oceanservice.noaa.gov/education/tutorial_corals/coral02_zooxanthellae.html","label":{"th":"NOAA: ปะการังและสาหร่ายซูแซนเทลลี","en":"NOAA: Coral and zooxanthellae"}},{"url":"https://oceanservice.noaa.gov/facts/coral_bleach.html?os=0","label":{"th":"NOAA: การฟอกขาวของปะการังคืออะไร","en":"NOAA: What is coral bleaching?"}},{"url":"https://greenfins.net/wp-content/uploads/2022/05/22-04-20-New-Best-Environmental-Practice-for-Snorkeller-poster-LIVE.pdf","label":{"th":"Green Fins: ข่าวเผยแพร่แนวทางดำน้ำตื้นอย่างรับผิดชอบ (3 พฤษภาคม 2022)","en":"Green Fins: snorkeller environmental guidance press release (3 May 2022)"}}]},
  "/surin-islands/beaches": {"title":{"th":"อ่าวและพื้นที่พักริมทะเลสุรินทร์","en":"Surin Islands bays and visitor areas"},"description":{"th":"แยกพื้นที่พัก จุดบริการ และจุดลงน้ำของหมู่เกาะสุรินทร์ พร้อมตรวจทางขึ้นลงและข้อจำกัดของอ่าวที่จะไป","en":"Distinguish accommodation areas from swimming and snorkeling stops, and check access arrangements at the bay you will visit."},"relatedPaths":["/surin-islands/accommodation","/surin-islands/snorkeling","/surin-islands/with-children"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}},{"url":"https://dan.org/health-medicine/travelers-medical-guide/travel-related-injuries/water-related-injuries-snorkeling-and-scuba-diving/","label":{"th":"Divers Alert Network: การดำน้ำตื้นและดำน้ำลึก","en":"Divers Alert Network: Snorkeling and scuba diving"}}]},
  "/surin-islands/moken-community": {"title":{"th":"รู้จักชุมชนมอแกนเกาะสุรินทร์","en":"Learning about Surin’s Moken community"},"description":{"th":"เรียนรู้บริบทชุมชนมอแกนเกาะสุรินทร์ พร้อมหลักการเยี่ยมเยือนที่เคารพเจ้าบ้าน ความเป็นส่วนตัว และการตัดสินใจของชุมชน","en":"Learn about the Moken community and approach any visit with respect for residents, privacy and the community’s own decisions."},"relatedPaths":["/surin-islands","/surin-islands/responsible-travel"],"sources":[{"url":"https://wikicommunity.sac.or.th/community/942","label":{"th":"ศูนย์มานุษยวิทยาสิรินธร: ชุมชนมอแกนเกาะสุรินทร์","en":"Sirindhorn Anthropology Centre: Moken Surin community"}}]},
  "/surin-islands/with-children": {"title":{"th":"เตรียมเที่ยวสุรินทร์กับเด็ก","en":"Planning a Surin Islands family visit"},"description":{"th":"ประเมินทริปสุรินทร์จากการเดินทาง อุปกรณ์เด็ก การดูแลใกล้น้ำ และทางเลือกพักก่อนตัดสินใจพาครอบครัวไป","en":"Assess the crossing, child-sized equipment, supervision near water and rest options before choosing a family visit."},"relatedPaths":["/surin-islands/beginner-snorkeling","/surin-islands/facilities","/surin-islands/travel-guide"],"sources":[{"url":"https://dan.org/health-medicine/travelers-medical-guide/travel-related-injuries/water-related-injuries-snorkeling-and-scuba-diving/","label":{"th":"Divers Alert Network: การดำน้ำตื้นและดำน้ำลึก","en":"Divers Alert Network: Snorkeling and scuba diving"}},{"url":"https://dan.org/safety-prevention/diver-safety/psa/safe-boating-guidelines/","label":{"th":"Divers Alert Network: แนวทางความปลอดภัยบนเรือ","en":"Divers Alert Network: Safe boating guidelines"}}]},
  "/surin-islands/travel-guide": {"title":{"th":"จัดกระเป๋าเที่ยวหมู่เกาะสุรินทร์","en":"What to pack for the Surin Islands"},"description":{"th":"จัดของสำหรับเที่ยวหมู่เกาะสุรินทร์แบบวันเดียวหรือค้างคืน แยกของใช้ระหว่างทางและตรวจอุปกรณ์ที่มีให้ก่อนแพ็ก","en":"Pack for a day visit or overnight stay, keep crossing essentials accessible and check what equipment is actually supplied."},"relatedPaths":["/surin-islands/piers","/surin-islands/accommodation","/surin-islands/park-rules"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}},{"url":"https://greenfins.net/about-green-fins/","label":{"th":"Green Fins: ข้อมูลโครงการ","en":"Green Fins: About the programme"}}]},
  "/surin-islands/park-rules": {"title":{"th":"ตรวจข้อกำหนดก่อนเข้าสุรินทร์","en":"Surin Islands entry and park rules"},"description":{"th":"เตรียมข้อมูลเข้าพื้นที่และตรวจประกาศอุทยานหมู่เกาะสุรินทร์ รวมถึงเขตปิด อุปกรณ์ และกิจกรรมที่ต้องสอบถามก่อน","en":"Check entry arrangements and park notices, including restricted areas, equipment and activities that need advance clarification."},"relatedPaths":["/surin-islands/best-time","/surin-islands/travel-guide","/surin-islands/responsible-travel"],"sources":[{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}},{"url":"https://news.dnp.go.th/news/11129","label":{"th":"กรมอุทยานฯ: ประกาศย้อนหลัง 26 ธันวาคม 2021 — ไม่ใช่ข้อมูลเปิดพื้นที่ปัจจุบัน","en":"DNP: historical notice, 26 December 2021 — not current access information"}}]},
  "/surin-islands/responsible-travel": {"title":{"th":"เที่ยวสุรินทร์อย่างรับผิดชอบ","en":"Responsible visits to the Surin Islands"},"description":{"th":"ลดผลกระทบระหว่างดำน้ำตื้นและพักบนเกาะสุรินทร์ ด้วยการดูแลอุปกรณ์ เว้นระยะสัตว์ทะเล และจัดการขยะของตนเอง","en":"Reduce your impact while snorkeling and spending time ashore by controlling equipment, respecting wildlife and managing your waste."},"relatedPaths":["/surin-islands/coral-reefs","/surin-islands/moken-community","/surin-islands/park-rules"],"sources":[{"url":"https://greenfins.net/wp-content/uploads/2022/05/22-04-20-New-Best-Environmental-Practice-for-Snorkeller-poster-LIVE.pdf","label":{"th":"Green Fins: ข่าวเผยแพร่แนวทางดำน้ำตื้นอย่างรับผิดชอบ (3 พฤษภาคม 2022)","en":"Green Fins: snorkeller environmental guidance press release (3 May 2022)"}},{"url":"https://greenfins.net/about-green-fins/","label":{"th":"Green Fins: ข้อมูลโครงการ","en":"Green Fins: About the programme"}}]},
  "/surin-islands/surin-vs-similan": {"title":{"th":"สุรินทร์หรือสิมิลัน เลือกอย่างไร","en":"Surin or Similan: how to choose"},"description":{"th":"เปรียบเทียบสุรินทร์กับสิมิลันจากสิ่งที่อยากเห็น การเดินทาง และรูปแบบทริป โดยไม่ตัดสินจากภาพทะเลเพียงอย่างเดียว","en":"Compare Surin and Similan by the scenery you want, transport arrangements and trip format rather than photographs alone."},"relatedPaths":["/surin-islands/snorkeling","/surin-islands/how-many-days","/surin-islands/getting-there"],"sources":[{"url":"https://www.tourismthailand.org/Articles/mu-koh-surin-the-tropical-paradise-in-andaman","label":{"th":"การท่องเที่ยวแห่งประเทศไทย: หมู่เกาะสุรินทร์ (9 มกราคม 2020)","en":"Tourism Authority of Thailand: Mu Koh Surin (9 January 2020)"}},{"url":"https://www.tourismthailand.org/Attraction/mu-ko-similan-national-park","label":{"th":"การท่องเที่ยวแห่งประเทศไทย: อุทยานแห่งชาติหมู่เกาะสิมิลัน","en":"Tourism Authority of Thailand: Mu Ko Similan National Park"}},{"url":"https://booking.dnp.go.th/parksdetail.php?id=47&name=","label":{"th":"กรมอุทยานฯ: ข้อมูลอุทยานหมู่เกาะสุรินทร์","en":"Department of National Parks: Mu Ko Surin park profile"}}]},
  "/faq": {"title":{"th":"คำถามที่พบบ่อย","en":"Frequently asked questions"},"description":{"th":"คำถามเรื่องโปรแกรมทัวร์สุรินทร์ สถานะคำขอจอง วันกลับ อาหาร และข้อมูลที่ควรเตรียมก่อนติดต่อกรีนวิว ทัวร์","en":"Answers about Surin tour choices, booking requests, return dates, meals and preparing to contact Greenview Tour."}},
  "/contact-us": {"title":{"th":"ติดต่อกรีนวิว ทัวร์","en":"Contact Greenview Tour"},"description":{"th":"ช่องทางติดต่อ ที่ตั้ง และแผนที่กรีนวิว ทัวร์จากข้อมูลบริษัท พร้อมข้อมูลที่ควรแจ้งเพื่อวางแผนทริปหมู่เกาะสุรินทร์","en":"Find Greenview Tour contact details, location and map, and the information to share when planning your island trip."}},
}
const paths = Object.keys(expectedArticles)
assert.equal(paths.length, 23)
const company = {name: 'Content fixture company', address: 'Fixture address', phone: '+66 123 4567', email: 'fixture@example.com', mapUrl: null}
let mode = 'ready', documentReads = 0
const errors = [], unexpected = [], expectedErrors = []
const browser = await chromium.launch({headless: true})
try {
  await mkdir(evidence, {recursive: true})
  const context = await browser.newContext({serviceWorkers: 'block', reducedMotion: 'reduce'})
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin !== new URL(origin).origin) return route.fulfill({status: 200, contentType: url.hostname.includes('googleapis') ? 'text/css' : 'text/html', body: ''})
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (request.method() !== 'GET') { unexpected.push(request.method() + ' ' + url.pathname); return route.fulfill({status: 405, json: {}}) }
    if (url.pathname === '/api/public/company') return route.fulfill({status: mode === 'error' ? 503 : 200, json: {company: mode === 'empty' ? null : mode === 'unsafe' ? {...company, mapUrl: 'javascript:alert(1)'} : company}})
    if (['/api/public/tours', '/api/public/popups', '/api/public/promotions'].includes(url.pathname)) return route.fulfill({json: {rows: [], page: 1, total: 0}})
    unexpected.push(url.pathname); return route.fulfill({status: 404, json: {}})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') { const text = message.text(); if (text.includes('503') && message.location().url.includes('/api/public/company')) expectedErrors.push(text); else errors.push(text) } })
  page.on('request', request => { if (request.resourceType() === 'document' && new URL(request.url()).origin === new URL(origin).origin) documentReads++ })
  async function language(value) {
    await page.locator('.language-selector > button').click()
    await page.locator('.language-options button').filter({hasText: value.toUpperCase()}).click()
    await page.waitForFunction(value => document.documentElement.lang === value, value)
  }
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(origin + '/')
  await page.locator('h1').waitFor()
  await page.evaluate(() => { window.contentShell = [document.querySelector('.site-header'), document.querySelector('.public-footer')] })
  const before = documentReads
  await page.locator('.public-main-nav a[href="/information"]').click()
  await page.locator('.information-grid a[href="/about"]').first().click()
  await page.waitForURL(origin + '/about')
  assert.equal(documentReads, before)
  assert.equal(await page.evaluate(() => window.contentShell[0] === document.querySelector('.site-header') && window.contentShell[1] === document.querySelector('.public-footer')), true)
  for (const width of [1440, 834, 390, 320]) {
    await page.setViewportSize({width, height: 1000})
    for (const locale of ['th', 'en']) {
      await language(locale)
      await page.goto(origin + '/information')
      await page.locator('.information-grid article').first().waitFor()
      assert.equal(await page.locator('h1').count(), 1)
      assert.equal(await page.title(), (locale === 'en' ? 'Information' : 'ข้อมูลการท่องเที่ยว') + ' | Greenview Tour')
      assert.equal(await page.locator('.information-grid article').count(), 23)
      assert.deepEqual(await page.locator('.information-grid h2 a').evaluateAll(links => links.map(link => link.getAttribute('href')).sort()), [...paths].sort())
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Information overflow at ' + width)
      if (width === 390 && locale === 'en') await page.screenshot({path: join(evidence, 'information-en-mobile.png'), fullPage: true})
      for (const path of paths) {
        await page.goto(origin + path)
        await page.locator('.editorial-page h1').waitFor()
        await page.waitForFunction(() => document.querySelector('meta[name="description"]')?.content.length > 50)
        assert.equal(await page.locator('h1').count(), 1)
        assert.equal(await page.locator('meta[name="description"]').count(), 1)
        const heading = await page.locator('.editorial-page h1').innerText()
        assert.equal(await page.title(), heading + ' | Greenview Tour')
        assert.equal(heading, expectedArticles[path].title[locale])
        assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), expectedArticles[path].description[locale])
        const article = expectedArticles[path]
        if (article.relatedPaths) {
          assert.deepEqual(await page.locator('.editorial-related a').evaluateAll(links => links.map(link => link.getAttribute('href'))), article.relatedPaths)
          assert.deepEqual(await page.locator('.editorial-sources a').evaluateAll(links => links.map(link => ({url: link.getAttribute('href'), text: link.textContent, target: link.target, rel: link.rel}))), article.sources.map(source => ({url: source.url, text: source.label[locale] + ' ↗', target: '_blank', rel: 'noreferrer'})))
        } else assert.equal(await page.locator('.editorial-related a').count(), 5)
        await page.waitForFunction(() => [...document.querySelectorAll('.editorial-hero img')].every(image => image.complete && image.naturalWidth > 0))
        assert.equal(await page.locator('vite-error-overlay').count(), 0)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, path + ' overflow at ' + width)
        if (width === 1440 && locale === 'th' && path === '/about' || width === 390 && locale === 'th' && path === '/surin-islands' || path === '/surin-islands/coral-reefs' && (width === 1440 && locale === 'en' || width === 320 && locale === 'th')) await page.screenshot({path: join(evidence, path.slice(1).replaceAll('/', '-') + '-' + locale + '-' + width + '.png'), fullPage: true})
      }
    }
  }
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(origin + '/surin-islands')
  const beforeRelated = documentReads
  await page.locator('.editorial-related a[href="/surin-islands/getting-there"]').click()
  await page.waitForURL(origin + '/surin-islands/getting-there')
  assert.equal(documentReads, beforeRelated)
  await language('th')
  assert.equal(await page.locator('h1').innerText(), expectedArticles['/surin-islands/getting-there'].title.th)
  await page.locator('.editorial-sidebar a').first().click()
  assert.equal(new URL(page.url()).hash, '#mainland-and-boat')
  await page.goto(origin + '/faq/')
  await language('en')
  await page.locator('#request-confirmation summary').click()
  assert.equal(await page.locator('#request-confirmation').getAttribute('open'), '')
  await language('th')
  assert.equal(await page.locator('#request-confirmation').getAttribute('open'), '')
  assert.match(await page.locator('#request-confirmation').innerText(), /ยังไม่ใช่การยืนยันการจอง/)
  await page.locator('.editorial-sidebar a[href="#group-size"]').click()
  assert.equal(await page.locator('#group-size').getAttribute('open'), '')
  await page.waitForFunction(() => document.activeElement?.id === 'group-size')
  await page.screenshot({path: join(evidence, 'faq-open-desktop.png'), fullPage: true})
  await page.locator('#group-size summary').focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('#group-size').getAttribute('open'), null)
  await page.goBack()
  assert.equal(new URL(page.url()).hash, '')
  mode = 'error'
  await page.goto(origin + '/contact-us/')
  await page.locator('#company [role="alert"]').waitFor()
  assert.equal(await page.locator('#company a').count(), 0)
  mode = 'ready'
  await page.locator('#company button').filter({hasText: /ลองอีกครั้ง|Try again/}).click()
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company h3').innerText(), company.name)
  for (const state of ['empty', 'unsafe']) {
    mode = state
    await page.reload()
    await page.waitForFunction(() => document.querySelector('#company [aria-busy]')?.getAttribute('aria-busy') === 'false')
    assert.equal(await page.locator('#company a[target="_blank"]').count(), 0)
    if (state === 'empty') assert.equal(await page.locator('#company a').count(), 0)
  }
  mode = 'ready'
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(origin + '/contact-us')
  await page.locator('#company h3').waitFor()
  await page.screenshot({path: join(evidence, 'contact-mobile.png'), fullPage: true})
  await page.locator('.public-menu-toggle').click()
  await page.locator('.public-main-nav a[href="/information"]').click()
  await page.locator('.information-grid a[href="/about"]').first().click()
  await page.waitForURL(origin + '/about')
  assert.equal(await page.locator('.public-menu-toggle').getAttribute('aria-expanded'), 'false')
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [])
  console.log(JSON.stringify({result: 'PASS', pages: paths, viewports: [1440,834,390,320], locales: ['th','en'], checks: ['one h1/title/description', 'images/overflow/overlay', 'persistent shell', 'FAQ keyboard/hash/locale preservation', 'company empty/error/retry/unsafe map', 'mobile menu'], expectedHttp503: expectedErrors.length, runtimeErrors: 0, businessWrites: 0, evidence}))
} finally { await browser.close() }
