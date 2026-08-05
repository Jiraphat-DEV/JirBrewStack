# JirBrewStack v2.1 Roadmap

วันที่: 2026-08-05
สถานะ: อนุมัติขอบเขตแล้ว ยังไม่ได้ทำ design ราย item

v2 เป็น static webapp ล้วน คำนวณสูตรจาก `src/data/brewing-rules.js` ที่อยู่ในโค้ด ไม่เก็บ state อะไรเลย v2.1 เพิ่ม Firebase Auth, Firestore และ Cloud Function ตัวเดียว เพื่อให้เก็บเมล็ด เก็บบันทึกการชง และแก้ตัวเลขได้โดยไม่ต้อง deploy

เอกสารนี้เป็นแผนใหญ่ ราย item อยู่ใน `2026-08-05-jirbrewstack-v2.1-req/`

## 1. ที่มา

### ตลาดตอนนี้

แอปกาแฟในตลาดปี 2026 แบ่งได้ 3 ค่าย

| ค่าย | ตัวอย่าง | ขายอะไร |
|---|---|---|
| สมุดบันทึก | Beanconqueror, BeanBook, Brote, Brew Journal, Coffee Library, Beanchive | คลังเมล็ด, log การชง, rating, tasting note ตาม SCA flavor wheel, สถิติย้อนหลัง |
| ไกด์ + จับเวลา | Filtru, Timer.Coffee, Brew Better | สูตร step-by-step พร้อม timer เดินตามจังหวะเท |
| ฮาร์ดแวร์ | Beanconqueror + Acaia/Decent/Felicita | ต่อ Bluetooth ดึงกราฟน้ำหนักสดระหว่างชง |

ฟีเจอร์ที่เจอซ้ำแทบทุกเจ้า: คลังเมล็ดพร้อมวันคั่ว, brew log + rating + tasting note, timer ตามสูตร, ชงซ้ำครั้งล่าสุด, cloud sync ข้ามเครื่อง (มักเป็นตัว Pro), แชร์สูตรเป็นลิงก์/QR/PDF, import เมล็ดด้วย QR หรือ AI อ่านถุง, แนะนำการปรับเบอร์บดจากประวัติ

### ช่องว่างที่เป็นจุดแข็งของเรา

ทุกเจ้าเป็นสมุดบันทึก คือผู้ใช้ต้องรู้สูตรมาก่อนแล้วค่อยจด ไม่มีเจ้าไหนคำนวณสูตรตั้งต้นให้จากคุณสมบัติเมล็ด (roast, process, altitude, origin) แบบที่ `brewing-rules.js` ทำ Brew Journal ใกล้ที่สุดแต่เดาจากประวัติของผู้ใช้เอง ไม่ใช่จากความรู้เรื่องเมล็ด และไม่มีเจ้าไหนรองรับ Delter Press

v2.1 จึงไม่ไล่ตามให้ครบทุกฟีเจอร์ในตลาด แต่เลือกเฉพาะตัวที่ทำให้วงจร คำนวณ ไป ชง ไป ชิม ไป ปรับ ปิดครบ

## 2. ข้อตัดสินใจที่ล็อกแล้ว

| หัวข้อ | ตัดสินว่า |
|---|---|
| ผู้ใช้ | เปิดสมัครสาธารณะ เริ่มจากวงเพื่อนไม่กี่คน ออกแบบเผื่อโต |
| Login | Google อย่างเดียว ไม่รองรับ email/password ไม่มี anonymous auth |
| ไม่ login | ใช้เครื่องคิดเลข timer ตารางแก้รส ตัวแปลงหน่วย และเปิดลิงก์แชร์ได้ครบ 100% |
| Rules | global ruleset ใน Firestore + override รายคน |
| Notion | เลิกเป็น source of truth Firestore แทนทั้งหมด |
| มือใหม่/มือโปร | ซ่อนของยากใต้หัวข้อ "ขั้นสูง" ไม่มีสวิตช์โหมด ไม่มี state เพิ่ม |
| Brew log | เป็นสมุดจดเป็นหลัก จดได้โดยไม่ต้องใช้ timer การวิเคราะห์เป็น opt-in และยังไม่ทำใน v2.1 |
| Timer | เขียนใหม่เป็นนับขึ้น กดจบขั้นเอง เก็บเวลาจริง |
| แชร์ | ลิงก์การ์ดสูตรที่พกค่าที่คำนวณเสร็จแล้ว ไม่ต้อง login ไม่แตะ Firestore |

### ไม่อยู่ในขอบเขต v2.1

| ไม่ทำ | เพราะ |
|---|---|
| คลังสูตรสาธารณะ / ฟีดชุมชน | เป็นผลิตภัณฑ์คนละตัว ต้องมี moderation, rate limit, ปุ่มรายงาน และเจอ cold start คือวันเปิดฟีดว่าง |
| แชร์ ruleset ให้กันใช้ | versioning เป็นหนี้ระยะยาว ruleset ที่แชร์ไว้จะอ้าง field ที่ base รุ่นใหม่ไม่มีแล้ว สูตรเพี้ยนเงียบ และไล่ปัญหาไม่ถูกว่าใครใช้กฎของใคร |
| วิเคราะห์แนวโน้มจากประวัติอัตโนมัติ | ต้องมีข้อมูลสะสมหลายสิบครั้งต่อเมล็ดถึงจะมีความหมาย ยังไม่มีข้อมูล |
| ต่อ Bluetooth ตาชั่ง | ผูกกับฮาร์ดแวร์ที่เจ้าของไม่มี |
| import เมล็ดด้วย QR / บาร์โค้ด / AI อ่านถุง | คลังเมล็ดมีของไม่กี่ถุง พิมพ์เร็วกว่ารอ OCR |
| รูปถ่าย, SCA flavor wheel, TDS, water chemistry | นอกกรอบที่ `brewing-rules.js` ใช้คำนวณ เก็บไปก็ไม่มีอะไรอ่าน |
| ปรับ dose ให้อัตโนมัติ | ยังล็อกตาม base ของแต่ละเครื่องเหมือน v2 ตารางแก้รสยังมีข้อความกำกับว่าต้องชั่งเอง |
| PWA / service worker | Firestore offline persistence คุมเรื่องเน็ตหลุดแล้ว และ ruleset มี fallback ในโค้ด |
| Router | สลับหน้าด้วย state ใน App.jsx อยู่แล้ว ลิงก์แชร์อ่าน query param ตอน mount ใช้โค้ดสิบกว่าบรรทัด ไม่คุ้มกับ dependency ใหม่ |
| ย้ายข้อมูลเก่าจาก Notion เข้า Firestore | บันทึกเก่าอยู่คนละหน่วยวัดและคนละ schema เทียบกับ log ใหม่ไม่ได้ ปล่อยไว้ที่ Notion เป็นเอกสารอ่านอย่างเดียว |

## 3. ของกลางที่ทุก item ใช้ร่วมกัน

### Firestore data model

```
rulesets/global                    { version, updatedAt, updatedBy, data: {...} }
users/{uid}                        { displayName, photoURL, createdAt }
users/{uid}/beans/{beanId}         { name, roaster, roast, process, altitude,
                                     origin, roastDate?, note?, archived, createdAt }
users/{uid}/brews/{brewId}         { beanId?, beanSnapshot, device, inputs, picks,
                                     resolved, overrideUsed?, actual, rating,
                                     tasteNote, createdAt }
users/{uid}/overrides/ruleset      { data: {...patch}, updatedAt }
```

สี่จุดที่ตั้งใจ

**`beanSnapshot` ใน brews คือค่าเมล็ด ณ วันที่ชง ไม่ใช่แค่ `beanId`** ถ้าอ้าง id อย่างเดียว พอแก้หรือ archive เมล็ด ประวัติเก่าจะเปลี่ยนตามหรือกลายเป็นค่าว่าง เก็บ `beanId` ไว้ด้วยเพื่อเชื่อมกลับ แต่การแสดงผลใช้ snapshot

**`resolved` เก็บค่าที่คำนวณได้จริง ไม่ใช่แค่ `inputs`** พอ ruleset เปลี่ยนทีหลัง ประวัติต้องยังบอกได้ว่าวันนั้นแอปสั่งให้ทำอะไร ไม่ใช่คำนวณใหม่ทุกครั้งที่เปิด

**`actual` แยกจาก `picks`** `picks` คือค่าที่แอปบอกให้ตั้ง `actual` คือค่าที่ทำจริง สองอันนี้ต่างกันเสมอในชีวิตจริง และช่องว่างระหว่างมันคือข้อมูลที่มีค่าที่สุดถ้าวันหนึ่งจะทำการวิเคราะห์

**ลบเมล็ดคือ `archived: true` ไม่ใช่ลบจริง** เพราะ brews อ้างถึงมันอยู่

`overrideUsed` เป็น field ที่ item 11 เป็นคนเพิ่ม ก่อนถึง item 11 จะยังไม่มีในบันทึก ไม่ต้องเผื่อไว้ล่วงหน้า

### Security rules

```
match /rulesets/global {
  allow read: if true;
  allow write: if false;
}
match /users/{uid}/{doc=**} {
  allow read, write: if request.auth.uid == uid;
}
```

`rulesets/global` ต้องอ่านได้ตอนไม่ login ไม่งั้นเครื่องคิดเลขพังสำหรับคนที่ไม่มีบัญชี และเขียนไม่ได้จากฝั่ง client เลย ต้องผ่าน Cloud Function

**ไม่มี field `role` ในฐานข้อมูล** ถ้าเก็บ `role: 'admin'` ไว้ใน `users/{uid}` ผู้ใช้เขียนทับตัวเองเป็น admin ได้ทันทีเพราะ rules อนุญาตให้เขียน doc ตัวเอง admin เช็คที่ uid ตรงๆ ใน Cloud Function ที่เดียว

### หลักการที่ห้ามละเมิด (ต่อจาก v2)

หลักการ 7 ข้อในสเปก v2 (`2026-08-01-jirbrewstack-v2-worksheet-design.md` ข้อ 2) ยังบังคับใช้ทั้งหมด บวกอีก 4 ข้อสำหรับ v2.1

8. **ไม่ login ต้องใช้งานได้ครบทุกอย่างที่ v2 ทำได้** การเพิ่ม backend ห้ามทำให้ฟีเจอร์เดิมต้องมีบัญชี
9. **เครื่องคิดเลขห้ามรอเน็ต** `brewing-rules.js` ในโค้ดคือค่าตั้งต้นที่ใช้ทันทีตอนเปิดแอป ruleset จาก Firestore มาทับทีหลัง ถ้าโหลดไม่ได้หรือ validate ไม่ผ่านให้ใช้ของในโค้ดต่อโดยไม่บอกผู้ใช้
10. **override ของผู้ใช้ห้ามเงียบ** ถ้าค่าถูกปรับด้วย override ต้องเขียนบอกบนการ์ดว่าปรับอะไรไปเท่าไหร่ ไม่งั้นจะเกิดปัญหา "ทำไมสูตรฉันไม่เหมือนของเธอ" ที่ไล่ไม่ถูก
11. **ประวัติการชงเป็นบันทึกที่ตายตัว** เขียนแล้วห้ามมีอะไรไปเปลี่ยนค่าย้อนหลัง ไม่ว่าจะเป็นการแก้เมล็ด การแก้ ruleset หรือการเปลี่ยน override

### การจัดการ error

| สถานการณ์ | ต้องทำ |
|---|---|
| โหลด `rulesets/global` ไม่ได้ หรือ validate ไม่ผ่าน | ใช้ rules ในโค้ดต่อ log ลง console ไม่แสดงอะไรกับผู้ใช้ |
| เขียน Firestore ไม่ได้เพราะออฟไลน์ | Firestore SDK คิวให้เองแล้วส่งตอนกลับมาออนไลน์ UI บอกว่าบันทึกแล้ว |
| login ไม่สำเร็จ | อยู่สถานะไม่ login ต่อ แอปยังใช้ได้ครบ แสดงข้อความสั้นๆ |
| ลิงก์แชร์ที่ parse ไม่ได้ หรือ format version ไม่รู้จัก | แสดงข้อความบอกว่าลิงก์ใช้ไม่ได้ แล้วเปิดหน้าสูตรปกติ ห้ามจอขาว |
| publish ruleset แล้ว validate ไม่ผ่าน | function ปฏิเสธ พร้อมคืน path ของ field ที่ผิด ไม่เขียนอะไรทั้งนั้น |

### กลยุทธ์เทส

| ชั้น | เครื่องมือ | ครอบคลุม |
|---|---|---|
| ตรรกะการคำนวณ | `node --test` ที่มีอยู่แล้ว | `brew.test.js` เดิมยังรันกับ `brewing-rules.js` ในโค้ดต่อไป ไม่ต้องแตะ |
| ตัวตรวจ ruleset | `node --test` | item 09 มีเทสของตัวเอง |
| Security rules | emulator + `@firebase/rules-unit-testing` | item 02 มี 5 เคส |
| UI | ทำมือ | ไม่มี component test ไม่คุ้มกับขนาดโปรเจกต์ |

เขียนเทส security rules ทั้งที่ปกติจะข้ามงานระดับนี้ เพราะ rules เป็นที่เดียวในโปรเจกต์ที่ความผิดพลาดเงียบสนิท เขียนพลาดแล้วข้อมูลทุกคนรั่วโดยไม่มีอะไรฟ้อง

### สิ่งที่ต้องยอมแลก

เพิ่ม `firebase` เป็น dependency แรกของโปรเจกต์ (v2 มีแค่ react กับ react-dom) ใช้ modular import เฉพาะ `firebase/app`, `firebase/auth`, `firebase/firestore` bundle จะโตขึ้นราว 150KB gzipped แลกไม่ได้ถ้าจะมี backend

## 4. รายการงานและลำดับ

12 item เรียงตามลำดับที่จะทำจริง เลขหน้าไฟล์คือลำดับ ไม่ใช่กลุ่ม

| # | item | กลุ่ม | ต้องรออะไร | ประมาณ |
|---|---|---|---|---|
| 01 | [timer-count-up](2026-08-05-jirbrewstack-v2.1-req/01-timer-count-up.md) | Timer | ไม่ต้องรออะไร | 2 ว |
| 02 | [firebase-foundation](2026-08-05-jirbrewstack-v2.1-req/02-firebase-foundation.md) | โครงสร้าง | ไม่ต้องรออะไร | 1.5 ว |
| 03 | [google-login](2026-08-05-jirbrewstack-v2.1-req/03-google-login.md) | บัญชี | 02 | 1 ว |
| 04 | [bean-library](2026-08-05-jirbrewstack-v2.1-req/04-bean-library.md) | เมล็ด | 03 | 2 ว |
| 05 | [bean-autofill](2026-08-05-jirbrewstack-v2.1-req/05-bean-autofill.md) | เมล็ด | 04 | 0.5 ว |
| 06 | [brew-log-form](2026-08-05-jirbrewstack-v2.1-req/06-brew-log-form.md) | บันทึก | 01, 03, 05 | 1.5 ว |
| 07 | [brew-history](2026-08-05-jirbrewstack-v2.1-req/07-brew-history.md) | บันทึก | 06 | 1.5 ว |
| 08 | [share-link](2026-08-05-jirbrewstack-v2.1-req/08-share-link.md) | แชร์ | ไม่ต้องรออะไร | 1 ว |
| 09 | [ruleset-validator](2026-08-05-jirbrewstack-v2.1-req/09-ruleset-validator.md) | Rules | ไม่ต้องรออะไร | 1 ว |
| 10 | [ruleset-load-global](2026-08-05-jirbrewstack-v2.1-req/10-ruleset-load-global.md) | Rules | 02, 09 | 1 ว |
| 11 | [ruleset-user-override](2026-08-05-jirbrewstack-v2.1-req/11-ruleset-user-override.md) | Rules | 03, 10 | 2 ว |
| 12 | [ruleset-admin-editor](2026-08-05-jirbrewstack-v2.1-req/12-ruleset-admin-editor.md) | Rules | 09, 10 | 2.5 ว |

รวมประมาณ 17.5 วัน

### ทำไมลำดับนี้

**01 มาก่อน 02** ทั้งที่เป็นงานคนละกลุ่ม เพราะไม่พึ่ง backend เลย แตะแค่ `Timer.jsx` กับ `useTimer.js` และเป็นปัญหาที่เจ้าของเจออยู่จริงตอนนี้ (ปัจจุบันเลิกใช้ timer ในแอปไปใช้ timer ข้างนอกแทน) ได้ของใช้ภายใน 2 วันโดยไม่ต้องรอโครงสร้างพื้นฐาน

**กลุ่ม Rules (09 ถึง 12) ไปท้ายสุด** ทั้งที่เป็นเหตุผลหนึ่งที่ทำ v2.1 เพราะเป็นก้อนที่เสี่ยงที่สุด (เขียน ruleset พลาดแล้วพังพร้อมกันทุกคน) และได้ประโยชน์กับคนเดียว ส่วน item 01 ถึง 08 ได้ประโยชน์กับทุกคนที่ใช้ ถ้าต้องหยุดกลางทางจะได้หยุดตรงที่ได้ของครบแล้ว

**08 แทรกได้ตลอด** ไม่พึ่งใครและไม่มีใครพึ่งมัน วางไว้ตรงนี้เพราะเป็นของชิ้นเล็กที่คั่นก่อนเข้ากลุ่มที่ยากที่สุด

## 5. ขั้นตอนต่อไป

แต่ละ item เดินตามวงจรของตัวเอง: อ่าน req ไป เขียน design ไป เขียน implementation plan ไป ลงมือ ไป review ไป merge

design กับ plan ยังไม่ต้องเขียนตอนนี้ เขียนตอนถึงคิวของแต่ละ item เพราะรายละเอียดของ item หลังๆ ขึ้นกับ schema ที่จะนิ่งจริงหลังทำ item 04 เสร็จ
