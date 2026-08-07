# JirBrewStack

เครื่องคำนวณสูตรกาแฟและตัวจับเวลาสำหรับ AeroPress (inverted) และ Delter Press คำนวณจาก roast, process, ระดับความสูง และ origin ของเมล็ด

ตัวเลขและกฎการชงทั้งหมดอยู่ในไฟล์เดียวคือ `src/data/brewing-rules.js` แก้ค่าได้โดยไม่ต้องแตะโค้ด

## Demo

https://jirbrewstack.web.app

## Features

- คำนวณสูตร AeroPress (inverted) และ Delter Press จาก 4 ตัวแปร: roast, process, ระดับความสูง, origin
- สูตรออกมาเป็นช่วงแนะนำ พร้อม slider ให้เลือกค่าจริงที่จะตั้งบนเครื่อง (อุณหภูมิ, เบอร์บด, เวลาแช่/กด, bypass ฯลฯ)
- ตัวจับเวลาแบบ step-by-step ที่เดินตามสูตรและค่าที่เลือกจริง พร้อมล็อกไม่ให้จอดับระหว่างชง
- ตารางแก้รส 5 ขั้น อ่านอย่างเดียว แยกตามเครื่องที่เลือก
- ตัวแปลงหน่วยบด Comandante C40 และ Timemore C2 เป็นเลขหน้าปัด Mavo Phantox Pro (ใช้อ่านสูตรเก่าเท่านั้น แอปทำงานด้วยเลขหน้าปัด Mavo ล้วน)
- Responsive mobile layout

## Tech Stack

- React 18
- Vite
- CSS (no frameworks)
- Firebase / Firestore (auth และ security rules)

## Prerequisites

`bun install` ลง dependency ของแอปให้ครบ แต่ `firebase-tools` ไม่ได้อยู่ใน `devDependencies` (ตั้งใจ ดู design spec) ต้องลง CLI เองแยกต่างหาก

```bash
npm i -g firebase-tools
```

emulator ต้องมี Java (JDK) ในเครื่องด้วย

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Run tests
bun run test

# รัน security rules test บน Firestore emulator (ต้องลง firebase-tools ก่อน)
bun run test:rules

# เปิด Firebase emulator ค้างไว้ (auth, firestore, hosting) ไว้ไล่ดู UI
bun run emulators
```
