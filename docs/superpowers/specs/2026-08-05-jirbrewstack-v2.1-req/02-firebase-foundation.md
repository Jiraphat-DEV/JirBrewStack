# 02 · โครงสร้าง Firebase

กลุ่ม: โครงสร้าง · ต้องรอ: ไม่ต้องรออะไร · ประมาณ 1.5 วัน
[กลับไป roadmap](../2026-08-05-jirbrewstack-v2.1-roadmap.md)

## ปัญหา

Firebase project `jirbrewstack` เปิด Blaze และเปิด API ครบแล้วตั้งแต่ 2026-08-04 แต่ฝั่ง repo ยังไม่มีอะไรเลย: ไม่มี Firestore database instance, `firebase.json` มีแต่ block `hosting`, ไม่มี `firestore.rules`, ไม่มี config emulator และ `deploy.yml` ใช้ `FirebaseExtended/action-hosting-deploy` ซึ่ง deploy ได้แค่ hosting

item นี้ไม่มีอะไรที่ผู้ใช้เห็น เป็นการวางรางให้ item 03 ขึ้นไปวิ่งได้

## ต้องได้อะไร

1. **Firestore database instance** ตำแหน่งคือการเลือกครั้งเดียวเปลี่ยนไม่ได้ ต้องยืนยันกับเจ้าของก่อนสร้าง (`asia-southeast1` ใกล้ไทยที่สุด) โหมด production ไม่ใช่ test mode
2. **`firestore.rules`** ตามที่ระบุในหัวข้อ "ของกลาง" ของ roadmap และ **`firestore.indexes.json`**
3. **`firebase.json`** เพิ่ม block `firestore` และ `emulators` (auth, firestore, hosting) โดย **rewrite catch-all `**` ของ hosting ต้องอยู่ท้ายสุดเสมอ** ถ้ามี rewrite อื่นมาทีหลังแล้วไปวางหลังมัน จะโดนกลืนทั้งหมด
4. **เทส security rules** ผ่าน emulator + `@firebase/rules-unit-testing` อย่างน้อย 5 เคส
   - ไม่ login อ่าน `rulesets/global` ได้
   - login แล้วเขียน `rulesets/global` ไม่ได้
   - ผู้ใช้ A อ่าน `users/B/beans` ไม่ได้
   - ผู้ใช้ A เขียน `users/B/beans` ไม่ได้
   - ผู้ใช้ A อ่านและเขียน `users/A/beans` ได้
5. **`deploy.yml`** เปลี่ยนจาก `action-hosting-deploy` เป็น firebase-tools + `GOOGLE_APPLICATION_CREDENTIALS` แล้ว deploy `firestore,hosting` ยังเป็น `workflow_dispatch` เหมือนเดิม ยังมีแค่ environment `uat` เหมือนเดิม (ตัวเลือก `prod` ที่ค้างอยู่เป็นการจงใจ ไม่ใช่ช่องโหว่ที่ต้องอุด)
6. **`.gitignore`** คลุมข้อมูล emulator กับ log ที่งอกมา (`firebase-debug.log` ที่ค้างอยู่ใน repo ตอนนี้ควรถูกลบและ ignore)
7. คำสั่งใน `package.json` สำหรับเปิด emulator และรันเทส rules

## ต้องไม่ทำอะไร

- ไม่สร้าง `functions/` ยัง item 12 เป็นคนสร้างพร้อมกับ function ตัวแรก การ deploy `--only functions` ทั้งที่ยังไม่มีฟังก์ชันจะล้มเปล่าๆ
- ไม่เพิ่ม `firebase` SDK เข้าฝั่ง frontend ยัง item 03 เป็นคนเพิ่ม
- ไม่แตะโค้ดแอปเลยสักบรรทัด
- ไม่เปิด environment `prod` เลือก prod วันนี้จะล้มที่ auth เพราะ secret ว่าง

## สิ่งที่ทำไปแล้วบน cloud ห้ามทำซ้ำ

ตรวจด้วย `gcloud services list --enabled --project jirbrewstack` ก่อนเสมอ อย่าเดา

- API ที่เปิดแล้ว: `cloudfunctions`, `cloudbuild`, `artifactregistry`, `run`, `eventarc`, `firestore`, `pubsub`
- service account เดียวของโปรเจกต์คือ `firebase-adminsdk-fbsvc@jirbrewstack.iam.gserviceaccount.com` และ key ของมันคือสิ่งที่อยู่ใน GitHub secret `FIREBASE_SERVICE_ACCOUNT` มี role ครบแล้ว (`cloudfunctions.admin`, `firebase.admin`, `iam.serviceAccountUser`, `firebase.sdkAdminServiceAgent`, `iam.serviceAccountTokenCreator`)
- คำสั่ง `gcloud projects add-iam-policy-binding` ถูกบล็อกโดย permission classifier ถ้าต้องแก้ IAM ให้ส่งคำสั่งให้เจ้าของรันเองด้วย `!`

## วัดผลยังไง

- `firebase emulators:start` ขึ้นครบ auth, firestore, hosting โดยไม่มี error
- เทส rules ทั้ง 5 เคสผ่านบน emulator
- `gcloud firestore databases list --project jirbrewstack` เห็น instance จริง
- สั่ง deploy uat ด้วยมือแล้วผ่าน และเปิด https://jirbrewstack.web.app แล้วแอปยังทำงานเหมือนเดิมทุกอย่าง (item นี้ต้องไม่เปลี่ยนอะไรที่ผู้ใช้เห็น)
- `bun run build` ขนาด bundle ไม่เปลี่ยน (ยังไม่มี firebase SDK เข้ามา)
