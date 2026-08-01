# JirBrewStack v2 — Worksheet Calculator (Design Spec)

วันที่: 2026-08-01
Branch: `feat/v2-worksheet`

## 1. เป้าหมายและขอบเขต

แทนที่โมเดลกาแฟเดิมของ JirBrewStack ทั้งหมดด้วยกรอบวิธีชงเวอร์ชันปัจจุบันที่เจ้าของสรุปไว้ใน Notion worksheet 2 หน้า (AeroPress inverted และ Delter Press)

ปัญหาเดิมที่ต้องแก้: แก้สูตรในแอปยากจนเลิกใช้แล้วย้ายไป Notion เป้าหมายของ v2 คือตัวเลขและกฎทั้งหมดอยู่ในไฟล์เดียว แก้ได้โดยไม่ต้องแตะโค้ด

### แหล่งข้อมูล (source of truth)

| แหล่ง | สถานะ |
|---|---|
| Notion `☕ สูตร AeroPress — คู่มือชง` (`39df3937-0750-8177-aa5a-d1bede3ecb95`) | authoritative สำหรับ AeroPress |
| Notion `☕ สูตร Delter Press คู่มือชง` (`3aef3937-0750-817e-b5a1-cf891d91f821`) | authoritative สำหรับ Delter |
| `/Users/jiraphat/temp/coffee_aeropress_research/` | เอกสารที่มาของตัวเลข ใช้อ้างอิงเหตุผล ไม่ใช่ตัวเลขที่ใช้จริง |

ตัวเลขทุกตัวในสเปกนี้ถอดมาจาก Notion ถ้า Notion กับ research folder ขัดกัน ให้ Notion ชนะ **สเปกนี้ต้องมีตัวเลขครบพอที่จะเขียนโค้ดและเทสได้โดยไม่ต้องเปิด Notion**

### อยู่ในขอบเขต

- หน้า Worksheet: เลือกเครื่อง + 4 ตัวแปรจากถุง แล้วได้สูตรเต็ม
- หน้า Timer: นับเวลาตาม step ที่คำนวณจากสูตรจริง พร้อมล็อกไม่ให้จอดับ
- หน้าแก้รส: ตารางขั้น 5 อ่านอย่างเดียว
- ช่องแปลงหน่วยบด C40/C2 → Mavo

### ไม่อยู่ในขอบเขต

- ไม่มี localStorage / ไม่จำ state ข้ามการเปิดแอป (แอปเป็น stateless ทั้งหมด)
- ไม่มีหน้า History ไม่มีบันทึกการชง (บันทึกอยู่ที่ Notion)
- ไม่มี PWA / service worker / offline
- ไม่มีปุ่มลัด "เมล็ดของฉัน"
- ไม่แสดง warning เรื่องระดับหลักฐานของหน้า Delter
- ไม่แตะ `.github/workflows/deploy.yml`, `firebase.json`, `.firebaserc`
- **ไม่รองรับการปรับ dose** ล็อกตาม base ของแต่ละเครื่อง (มีผลกับหน้าแก้รส ดูข้อ 4.6)

## 2. หลักการที่ห้ามละเมิด

กฎเหล่านี้มาจาก Notion และเป็นเหตุผลที่โมเดลเดิมถูกทิ้ง ต้องสะท้อนอยู่ในผลลัพธ์ของแอป

1. **ค่าคงที่ของสองเครื่องแยกกันเด็ดขาด** ห้ามมี field ใดใช้ค่าร่วมกัน แม้ตัวเลขจะบังเอิญเท่ากัน (เช่น grind base 6.0 ทั้งคู่ ต้องเขียนแยกสองที่) เพราะ Notion สั่งไว้ว่า "Delter เป็นเอกเทศ ห้าม sync เลขกับหน้า AeroPress"
2. **ทิศทางความผิดพลาดของสองเครื่องกลับกัน** AeroPress = immersion เสี่ยงสกัดเกิน (ขม/ไม่มีกลิ่น) Delter = percolation เสี่ยงสกัดไม่พอ (บาง/เปรี้ยว) ตารางแก้รสจึงเรียงลำดับสลับกัน
3. **ห้ามลดการสกัดหลายทางพร้อมกัน** (เย็น + บาง + สั้น + หยาบ) กรอบเดิมพลาดตรงนี้
4. **บดหยาบขึ้นต้องคู่กับเพิ่มโดส** ห้ามหยาบเดี่ยวๆ ไม่งั้นจะกลายเป็นบาง โมเดลปรับ dose ให้ไม่ได้ (ล็อกไว้) จึงต้องเตือนแทน ดูข้อ 4.2
5. **Altitude ไม่แตะ temperature** แตะเฉพาะ grind (และ pre-infusion บน Delter) กฎเดิมที่ให้ altitude บวก temp ถูกถอดออกเพราะไปหักล้างส่วนลดของ fermented
6. **หน่วยบดเป็น Mavo Phantox Pro เท่านั้น** Timemore C2 เลิกใช้แล้ว C40 ไม่ได้มี ทั้งสองมีไว้แค่แปลงหน่วยตอนอ่านสูตรจากเน็ต
7. **ปัดค่า grind เป็นทวีคูณของ 0.5 เสมอ** เพราะ 1 C40 click = 2.7 Mavo clicks ค่าที่ละเอียดกว่านี้ไม่มีความหมาย

## 3. สถาปัตยกรรม

React 18 + Vite เหมือนเดิม ไม่เพิ่ม dependency ใดๆ (คงไว้ที่ `react` + `react-dom`) ไม่มี router state ทั้งหมดอยู่ใน `App.jsx`

```
App.jsx  ── state: device, roast, process, altitude, origin, view, picks
   │        header มีปุ่มสลับ "สูตร" / "แก้รส" ตลอดเวลา
   │
   ├── Worksheet.jsx ── เลือกเครื่อง + 4 กลุ่มปุ่ม
   │     ├── RecipeCard.jsx ── การ์ดสูตร + slider เลือกค่าในช่วง + ปุ่ม "เริ่มชง"
   │     └── GrindConverter.jsx ── C40/C2 -> Mavo
   ├── Timer.jsx ── รับ {steps, totalTime} จาก buildTimerSteps() + useWakeLock
   │     └── TimerStep.jsx
   └── FixTable.jsx ── ตารางแก้รส อ่านอย่างเดียว
```

Data flow เป็นทางเดียว: input 5 ช่อง → `computeRecipe()` → recipe object → RecipeCard แสดง + ให้เลือกค่าในช่วง → `buildTimerSteps(recipe, picks)` → Timer

### ไฟล์ที่สร้างใหม่

| ไฟล์ | หน้าที่ | ประมาณ |
|---|---|---|
| `src/data/brewing-rules.js` | ตัวเลขและข้อความไทยทั้งหมด `export default {...}` | ~300 บรรทัด |
| `src/data/brew.js` | `computeRecipe`, `toMavo`, `buildTimerSteps` | ~100 บรรทัด |
| `src/data/brew.test.js` | `node --test` | ~200 บรรทัด |
| `src/components/Worksheet.jsx` + `.css` | ฟอร์มเลือก 5 ช่อง | ~90 |
| `src/components/RecipeCard.jsx` + `.css` | การ์ดสูตร + slider | ~110 |
| `src/components/GrindConverter.jsx` + `.css` | แปลงหน่วย | ~50 |
| `src/components/FixTable.jsx` + `.css` | ตารางแก้รส | ~60 |
| `src/hooks/useWakeLock.js` | `navigator.wakeLock` | ~25 |

**ทำไม `brewing-rules.js` ไม่ใช่ `.json`**: ต้องใส่คอมเมนต์กำกับที่มาของตัวเลขได้ (JSON ห้ามคอมเมนต์) และ import ได้ทั้งใน Vite และ `node --test` โดยไม่ต้องมี import attribute ข้างในเป็น object ล้วน ไม่มี logic ไม่มี import

### ไฟล์ที่เขียนใหม่ทั้งไฟล์

| ไฟล์ | ทำไม |
|---|---|
| `src/App.jsx` | โครง state เปลี่ยนหมด (จาก method/strength/roast/bean + 4 view เป็น device + 4 input + 3 view) และ UI เป็นภาษาไทย |
| `src/components/Timer.jsx` (+ `.css` แก้เท่าที่จำเป็น) | ปัจจุบันผูกกับ `recipes.js` (`recipe.icon/name/subtitle`, `getAdjustedTemperature`) รับ props `method/strength/roastLevel/onRateBrew` และข้อความเป็นอังกฤษทั้งไฟล์ (Back, Coffee, Water, Temp, Reset, Start, Brew Complete!) ปุ่ม "Rate This Brew" ยิงไปหาคอมโพเนนต์ที่ถูกลบ ไม่มีอะไรเหลือให้เก็บนอกจากโครง layout |
| `src/components/TimerStep.jsx` | ปัจจุบันเรียก `step.getInstruction(values)` / `step.getAmount(values)` ซึ่ง contract ใหม่ไม่มี (ค่าถูก substitute เป็น string มาแล้ว) และข้อความเป็นอังกฤษ |

### ไฟล์ที่เก็บไว้ไม่แก้

`src/hooks/useTimer.js` — เป็น logic นับเวลาล้วน ไม่มีข้อความ ไม่รู้จักกาแฟ **contract ที่มันบังคับไว้ (ยืนยันจากไฟล์จริง)**: `useTimer(steps, totalTime)` หา step ปัจจุบันจาก `step.startTime` แบบสะสม (absolute) โดยหาจุดจบของ step จาก `startTime` ของ step ถัดไป ถ้าเป็น step สุดท้ายใช้ `totalTime` **มันไม่อ่าน `step.duration` เลย** และคืน `isComplete` มาให้ ซึ่งใช้แสดงสถานะ "ชงเสร็จแล้ว" ได้ตรงๆ

`src/main.jsx`, `src/index.css` (design tokens ธีมกาแฟเดิม), `src/App.css`, `vite.config.js`, `firebase.json`, `.firebaserc`, `.github/workflows/deploy.yml`

`index.html` แก้เฉพาะ `<title>` และ meta description ที่ยังเขียนถึง Timemore C2

### ไฟล์ที่ลบ

`src/data/recipes.js`, `src/data/dialInLogic.js`, `src/hooks/useBrewHistory.js`, `src/hooks/useLocalStorage.js`, และคอมโพเนนต์ `BrewHistory`, `SaveRecipeModal`, `StarRating`, `DialInAssistant`, `FeedbackSlider`, `StrengthSlider`, `BeanTypeSelector`, `MethodSelector`, `RoastSelector`, `GrindDisplay`, `Calculator`, `InputField` (พร้อม `.css` ของแต่ละตัว) รวม ~2,400 บรรทัด

ทั้งหมดผูกกับโมเดลเดิม (strength scale 1-5, Timemore C2 clicks, extraction quadrant จาก slider 6 ตัว) ซึ่งไม่มีที่ใช้ในโมเดลใหม่

## 4. โมเดลคำนวณ

### 4.1 Input

ปุ่มทั้งหมด ไม่มีช่องพิมพ์ตัวเลข

| ช่อง | ตัวเลือก | ค่าตั้งต้น |
|---|---|---|
| device | `aeropress` (inverted) · `delter` | `aeropress` |
| roast | `agtron95plus` (95+ very light) · `agtron80_95` (80-95 light) · `agtron65_80` (65-80 medium) | `agtron80_95` |
| process | `washed` · `honey` · `natural` · `anaerobic` · `cm` · `doubleAnaerobic` · `yeast` · `barrel` | `washed` |
| altitude | `high` (>1,800) · `mid` (1,200-1,800) · `low` (<1,200) | `mid` |
| origin | `ethiopia` · `kenya` · `colombia` · `brazil` · `panamaGeisha` · `thai` | `colombia` |

### 4.2 กติกาการรวมค่า

ทุก output ที่เป็นตัวเลขเก็บเป็นช่วง `[min, max]` เสมอ (ค่าเดี่ยวคือ `[n, n]`) ทำให้กติกาเดียวใช้ได้ทุก field

เริ่มจาก `base` แล้ว apply patch ตามลำดับ **roast → process → altitude → origin** (ลำดับเดียวกับขั้น 1-4 ใน worksheet) แต่ละ patch มีได้ 3 แบบ:

| แบบ | ความหมาย | ตัวอย่าง |
|---|---|---|
| `{ temp: [-6, -3] }` | delta บวกสะสมเข้าไปทั้งสองปลาย | `[88,88] + [-6,-3] = [82,85]` |
| `{ steep: [120, 150] }` | ทับค่าเดิมทั้งช่วง | steep กลายเป็น `[120,150]` |
| `{ steepAdd: 15 }` | สะสมแยก บวกครั้งเดียวตอนท้าย | `[120,150] -> [135,165]` |

field ประเภท **delta**: `temp`, `grind`
field ประเภท **ทับ**: `steep`, `preinfusionWait`, `pressSpeed`, `restBetween`, `bypass`
field ประเภท **บวกท้าย**: `steepAdd`, `preinfusionAdd`
field ประเภท **สะสมเป็น list**: `note` (string ต่อท้ายกัน แสดงใต้การ์ด)

`steepAdd` / `preinfusionAdd` สะสมรวมกันจากทุกขั้นแล้วบวกครั้งเดียวหลังสุด ถ้าโดนสองขั้น (roast `agtron95plus` +15 และ altitude `high` +15) จะได้ +30

**ลำดับสำคัญ**: ทั้ง roast และ process ต่างก็ทับ `steep` ได้ เมื่อ process มาทีหลัง process จึงชนะ ตรงกับที่ Notion แก้ไว้ว่าให้ attribute ของ process มาก่อน attribute ของ roast (medium + washed ได้ steep `[105,105]` ของ washed ไม่ใช่ `[105,135]` ของ medium) กรณีนี้ไม่ทำให้คอลัมน์ steep ของ roast ตาย เพราะ `honey` และ `natural` ไม่ได้ทับ steep ค่าจาก roast จึงรอดในสองเคสนั้น

**ข้อยกเว้นเดียว — `preinfusionWait` บน Delter กำหนดจาก roast เท่านั้น** ตาราง Process ของ Delter ใน Notion ระบุ pre-infusion ครบทุกแถว ถ้าปล่อยตามกติกาปกติ process จะทับทุกครั้งจนคอลัมน์ pre-infusion ของ roast ตายสนิท ทั้งที่คอลัมน์ของ process แทบไม่มีข้อมูล (40-60 คือ base เฉยๆ · 40-50 · 40) ส่วนคอลัมน์ของ roast ต่างกันจริงและตรงกับเหตุผลว่า pre-infusion มีไว้จัดการความแน่นของเมล็ด ซึ่งเป็นเรื่องของ roast จึง**ตัด `preinfusionWait` ออกจากตาราง Process ทั้งหมด** ให้ roast เป็นเจ้าของ field นี้คนเดียว (altitude ยังบวก `preinfusionAdd` ทับได้ตามปกติ)

หลัง apply ครบทั้ง 4 ขั้น:

1. ปัด `grind` ทั้งสองปลายเป็นทวีคูณของ 0.5
2. คำนวณ ratio ที่ derive ได้: `ratioConcentrate = water / dose` และ `ratioFinal = (water + bypass) / dose` (คำนวณทั้งปลาย min และ max — bypass น้อย = ratio แน่นกว่า)
3. **เตือน "หยาบกว่า base"**: ถ้า `grind.min > base.grind.min` ให้เติม note ท้ายสุดว่า *"บดหยาบกว่า base แล้ว ถ้าออกมาบางให้เพิ่มกาแฟ 2 g (หยาบต้องคู่กับเพิ่มโดส ห้ามหยาบเดี่ยวๆ)"* เป็นการบังคับใช้หลักการข้อ 4 ในเมื่อแอปปรับ dose ให้เองไม่ได้

**ไม่มีการ clamp temperature** เดิมเคยออกแบบให้มี `tempCap` แต่ไล่ทุก combo แล้วพบว่า AeroPress ได้ temp 82-90 (กรอบ 80-92) และ Delter ได้ 86-93 (กรอบ 85-94) แปลว่า clamp ไม่มีทางทำงานจาก input ที่เป็นไปได้จริง จึงเป็น dead code และการมี clamp ยังทำให้ typo ใน `brewing-rules.js` ถูกกลบเงียบๆ แทนที่จะดังออกมา ย้ายไปเป็นเทสแทน (ดูเทส 7)

Origin ถูก apply เป็นขั้นสุดท้าย จึงชนะทุกขั้นก่อนหน้าในกรณีที่ใช้ค่าแบบทับ

### 4.3 ตารางค่า — AeroPress (inverted)

**Base**

| field | ค่า | หมายเหตุ |
|---|---|---|
| dose | 18 g | |
| water | 190 g (1:10.5) | ค่ากลางแชมป์ WAC |
| temp | `[88, 88]` | |
| grind | `[6.0, 6.0]` | |
| steep | `[90, 90]` (1:30) | |
| pressDuration | 30 วิ ช้าเบา | ค่าคงที่ ไม่มี patch ไหนแตะ |
| bypass | `[60, 100]` g น้ำร้อน | รวมสุดท้าย 1:14 ถึง 1:16 |
| drinkTemp | 60-70°C | ข้อความคงที่ |
| filter | กระดาษ 1 ใบ (ล้างก่อน) fermented หรืออยากได้ clarity ลอง 2 ใบ | ข้อความคงที่ |
| bloom | ไม่ทำเป็น default เทน้ำครบ คนเบา 2-3 ที | ข้อความคงที่ |

**ขั้น 1 Roast**

| roast | temp | grind | steep |
|---|---|---|---|
| `agtron95plus` | — | `[-0.5, -0.5]` | `steepAdd: 15` |
| `agtron80_95` | — | — | — |
| `agtron65_80` | `[+2, +2]` | `[+0.5, +1.0]` | ทับเป็น `[105, 135]` |

**ขั้น 2 Process**

| process | temp | grind | steep | note |
|---|---|---|---|---|
| `washed` | `[0, 0]` | — | `[105, 105]` | สะอาด เปรี้ยวสดใส เป็น process เดียวที่ข้าม bypass ได้ ถ้าอยากลองให้ชง 18 g / น้ำ 250 g รวดเดียว (1:14) แล้วไม่ต้องเติมน้ำในแก้ว — แอปไม่ได้คำนวณสูตรนั้นให้ ต้องทำเอง |
| `honey` | `[0, 0]` | — | — | หวานนุ่ม body ดี |
| `natural` | `[-1, -1]` | — | — | รักษาหวาน/ผลไม้ |
| `anaerobic` | `[-3, -3]` | — | `[105, 120]` | ละลายเร็ว over ง่าย ขมให้เพิ่ม bypass ก่อน อย่าเพิ่งบดหยาบ |
| `cm` | `[-3, -3]` | `[0, +0.5]` | `[105, 120]` | โบ๊ซ/ไวน์ ถ้า over จะออกขม/ยา แนะนำ bypass |
| `doubleAnaerobic` | `[-6, -3]` | `[0, +0.5]` | `[120, 150]` | cell wall พังมากสุด over ไวสุด bypass จำเป็น |
| `yeast` | `[-3, -3]` | — | `[105, 120]` | ผลไม้จัด ระวังโบ๊ซ |
| `barrel` | `[-3, -3]` | — | `[105, 120]` | กลิ่นเหล้าระเหยง่าย คนเบาสุด bypass ช่วยให้กลิ่นเหล้าเด่นแบบไม่ขม |

**ขั้น 3 Altitude**

| altitude | grind | steep |
|---|---|---|
| `high` | `[-0.5, -0.5]` | `steepAdd: 15` |
| `mid` | — | — |
| `low` | `[+0.5, +0.5]` | — |

**ขั้น 4 Origin**

| origin | ปรับ | โทนรส (note) |
|---|---|---|
| `ethiopia` | — | ดอกไม้ ซิตรัส เบอร์รี่ ลิ้นจี่ ชา เอา clarity ปลายเย็น |
| `kenya` | — | เบอร์รี่/แบล็คเคอแรนต์ เปรี้ยวจัด สะอาด รับ extraction ได้นิดเพื่อ body |
| `colombia` | — | บาลานซ์ คาราเมล ผลไม้แดง ใช้ base |
| `brazil` | — | ถั่ว ช็อกโกแลต เปรี้ยวต่ำ ให้อภัยง่าย base หรือเย็นนิด |
| `panamaGeisha` | ทับ `temp: [85, 87]` เท่านั้น | มะลิ เบอร์กาม็อต พีช ทรอปิคอล คนเบาสุด เลื่อน bypass ไปปลายสูงของช่วงเพื่อ clarity |
| `thai` | — | หลากหลาย ยึด Process เป็นหลัก |

### 4.4 ตารางค่า — Delter Press

**Base**

| field | ค่า | หมายเหตุ |
|---|---|---|
| dose | 15 g | |
| water | 200 g (1:13.3) | ถึงขาล่างของวงเล็บ FILL พอดี |
| temp | `[91, 91]` | สูงกว่า AeroPress 3°C ชดเชยที่ไม่มีการแช่ |
| grind | `[6.0, 6.0]` | |
| preinfusionMark | ขีด 50 (ต่ำสุดบนสเกล PRESS) | ข้อความคงที่ |
| preinfusionWait | `[40, 60]` วิ | |
| strokes | 2 จังหวะ ที่ขีด 75 | ข้อความคงที่ |
| pressSpeed | `[20, 25]` วิ/จังหวะ | |
| restBetween | `[15, 20]` วิ | |
| yield | ~170 g | 200 ลบผงดูดซับ ~30 g |
| bypass | `[30, 60]` g **น้ำอุณหภูมิห้อง** | รวมสุดท้าย 1:15 ถึง 1:17 หน้าที่คือดึงอุณหภูมิถ้วยลง ไม่ใช่ลดขม |
| drinkTemp | 60-70°C | ข้อความคงที่ |
| filter | กระดาษ Delter 1 ใบ (ล้างก่อน) ห้ามซ้อน 2 ใบ เพราะจะกดฝืด | ข้อความคงที่ |

**เพดานโดสของ Delter มีสองตัว คนละเรื่องกัน** (ไม่ใช่ตัวเลขที่ขัดกัน) — **25 g** คือความจุห้องกาแฟ เกินกว่านี้ผงล้นลงถ้วย · **20 g** คือเพดานใช้งานจริง เกินกว่านี้เริ่มกดฝืดแม้ผงจะยังไม่ล้น ทั้งสองตัวปรากฏในตารางแก้รสคนละแถวกันโดยตั้งใจ

**ขั้น 1 Roast**

| roast | temp | grind | preinfusionWait |
|---|---|---|---|
| `agtron95plus` | — | `[-0.5, -0.5]` | `[60, 75]` |
| `agtron80_95` | — | — | `[40, 60]` |
| `agtron65_80` | `[+2, +2]` | `[+0.5, +0.5]` | `[30, 40]` |

**ขั้น 2 Process**

ไม่มีคอลัมน์ `preinfusionWait` โดยตั้งใจ (ดูข้อยกเว้นในข้อ 4.2)

| process | temp | grind | pressSpeed | note |
|---|---|---|---|---|
| `washed` | `[0, 0]` | — | `[25, 30]` | ให้อภัยง่ายสุด เหมาะใช้ calibrate เครื่อง |
| `honey` | `[0, 0]` | — | `[25, 30]` | เครื่องนี้ให้ body น้อยกว่า AeroPress อยู่แล้ว กดช้าไว้ |
| `natural` | `[-1, -1]` | — | `[20, 25]` | รักษาหวาน/ผลไม้ |
| `anaerobic` | `[-3, -3]` | — | `[20, 25]` | ละลายเร็วแต่ไม่ขมมากบนเครื่องนี้ อย่าเพิ่งรีบลดอะไร |
| `cm` | `[-3, -3]` | `[0, +0.5]` | `[20, 25]` | โบ๊ซ/ไวน์ ถ้าเปรี้ยวไปให้กดช้าลงก่อน อย่าเพิ่งขึ้น temp |
| `doubleAnaerobic` | `[-5, -3]` | `[0, +0.5]` | `[15, 20]` | แถวเดียวที่กดเร็วได้ over ไวสุด |
| `yeast` | `[-3, -3]` | — | `[20, 25]` | ผลไม้จัด ระวังโบ๊ซ |
| `barrel` | `[-3, -3]` | — | `[20, 25]` | เครื่องนี้เหมาะกับ barrel เป็นพิเศษ ไม่มีไอน้ำแช่ไล่กลิ่นเหล้า |

**ขั้น 3 Altitude**

| altitude | grind | preinfusionWait |
|---|---|---|
| `high` | `[-0.5, -0.5]` | `preinfusionAdd: 15` |
| `mid` | — | — |
| `low` | `[+0.5, +0.5]` | — |

**ขั้น 4 Origin**

| origin | ปรับ | โทนรส (note) |
|---|---|---|
| `ethiopia` | — | ดอกไม้ ซิตรัส เบอร์รี่ ลิ้นจี่ ชา เหมาะกับเครื่องนี้สุด ใช้ base |
| `kenya` | ทับ `pressSpeed: [30, 35]` | เปรี้ยวจัดอยู่แล้วและเครื่องนี้เปรี้ยวง่าย กดช้าสุด |
| `colombia` | — | บาลานซ์ คาราเมล ผลไม้แดง ใช้ base |
| `brazil` | — | ถั่ว ช็อกโกแลต เปรี้ยวต่ำ ให้อภัยง่าย ลอง 2 จังหวะเร็วได้ |
| `panamaGeisha` | ทับ `bypass: [55, 60]` | มะลิ เบอร์กาม็อต พีช ทรอปิคอล เติม bypass เยอะให้จบที่ 1:17 |
| `thai` | — | หลากหลาย ยึด Process เป็นหลัก |

### 4.5 ตาราง combo อุณหภูมิที่ต้องตรงเป๊ะ

ถอดมาจากตาราง "combo ที่พบบ่อย" ของทั้งสองหน้าใน Notion ใช้เป็น expected value ของเทส 2 โดยตรง (altitude = `mid`, origin = `colombia` ซึ่งทั้งคู่ไม่แตะ temp)

| Roast | Process | AeroPress | Delter |
|---|---|---|---|
| Light (`agtron80_95`) | Washed / Honey | 88 | 91 |
| Light | Natural | 87 | 90 |
| Light | Anaerobic / Barrel / CM / Yeast | 85 | 88 |
| Light | Double / Extended anaerobic | 82-85 | 86-88 |
| Medium (`agtron65_80`) | Washed / Honey | 90 | 93 |
| Medium | Anaerobic | 87 | 90 |

Delter สูงกว่า AeroPress 3°C ทุกแถว ยกเว้นแถว double anaerobic ที่ offset ต่างกันโดยตั้งใจ (AeroPress `[-6,-3]` vs Delter `[-5,-3]`) ทำให้ปลาย max ต่างกัน 3 แต่ปลาย min ต่างกัน 4

### 4.6 การแปลงหน่วยบด

```
Mavo = C40_clicks * 0.271
Mavo = C2_clicks  * 0.320    // ความเชื่อถือต่ำ
```

ปัดผลลัพธ์เป็นทวีคูณของ 0.5 ช่อง C2 ต้องมีข้อความกำกับว่า "ใช้อ่านสูตรเก่าเท่านั้น ห้ามใช้ตั้งค่าจริง" เพราะ C2 มีช่วงใช้งานจริงแค่ ~36 คลิก (1 C2 click = 3.2 Mavo clicks) และการแปลงเทียบเฉพาะระยะห่างเฟือง ไม่ได้เทียบปริมาณผงละเอียด วัดจาก 23 สูตรที่ระบุทั้ง C2 และ C40 พบว่าเส้นทาง C2 ให้ค่าละเอียดกว่าเส้นทาง C40 เฉลี่ย 0.69 Mavo

### 4.7 ตารางแก้รส (ขั้น 5) — อ่านอย่างเดียว

แสดงตามเครื่องที่เลือก ทำทีละข้อ ชิมทุกครั้ง หยุดเมื่อดีขึ้น

หัวหน้ามีข้อความกำกับถาวร: **"ข้อที่บอกให้เพิ่มกาแฟ ต้องชั่งเอง แอปล็อกโดสไว้ที่ base ไม่ได้ปรับให้"** เพราะหลายข้อในตารางสั่งเปลี่ยน dose (AeroPress +2 g / เป็น 20 g · Delter เป็น 17-18 g) ซึ่งอยู่นอกขอบเขตของแอป ถ้าไม่เขียนกำกับ คนใช้จะไปหาปุ่มปรับโดสที่ไม่มีอยู่

**AeroPress** (ขึ้นอาการ "ขม" ก่อน เพราะเป็นความผิดพลาดหลักของเครื่องนี้)

| อาการ | ลำดับการแก้ |
|---|---|
| ขม / ไม่มีกลิ่น / แบน | 1) ลด temp 1-2°C · 2) ยังขม เพิ่ม bypass อีก 20-30 g · 3) ยังขม คนเบาลง หรือ steep สั้นลง · 4) ยังขม บดหยาบขึ้น Mavo +0.5 **พร้อมเพิ่มกาแฟ 2 g** (หยาบลอยๆ จะกลายเป็นบาง) |
| เปรี้ยว / บาง / จืด | 1) บดละเอียดขึ้น Mavo −0.5 · 2) ยังเปรี้ยว steep นานขึ้น · 3) ยังเปรี้ยว +1-2°C · 4) ลด bypass ลง |
| บางไป ไม่แน่น | 1) ลด bypass ลง · 2) ยังบาง เพิ่มกาแฟเป็น 20 g |

**Delter** (ขึ้นอาการ "บาง/เปรี้ยว" ก่อน)

| อาการ | ลำดับการแก้ |
|---|---|
| บาง / จืด / เปรี้ยว / ไม่มี body | 1) บดละเอียดขึ้น Mavo −0.5 ถึง −1 · 2) ยังบาง กดช้าลง ยืดเป็น 30-40 วิ/จังหวะ · 3) ยังบาง ยืดเวลารอหลัง pre-infusion เป็น 60 วิ และเพิ่มพักระหว่างจังหวะเป็น 30 วิ · 4) ยังบาง ลด bypass แล้วเพิ่มกาแฟเป็น 17-18 g |
| ขม / ฝาด | 1) **เช็คก่อนว่ากดฝืดไหม** ถ้าฝืดคือต้นเหตุ บดหยาบขึ้น +0.5 แล้วหยุด · 2) ไม่ฝืดแต่ยังขม ลด temp 2-3°C · 3) ยังขม เพิ่ม bypass 20-30 g · 4) ยังขม แบ่งเป็น 3 จังหวะแทน 2 |
| เปรี้ยวแหลม **และ** ขมพร้อมกัน | อาการ channeling น้ำเจาะทางเดียว เคาะปรับหน้าผงให้เรียบก่อนกด ยืด pre-infusion กดช้าลง ห้ามฝืน (อาการนี้ไม่มีบน AeroPress เพราะเป็นการแช่เต็มตัว) |
| กดฝืดมาก / เครื่องเกือบล้ม | บดหยาบขึ้น +0.5 ถึง +1 ทันที ห้ามฝืน และเช็คว่าโดสไม่เกิน **20 g** (เพดานใช้งานก่อนกดฝืด) กับใส่กระดาษใบเดียว |
| น้ำทะลุเร็วผิดปกติ แทบไม่มีแรงต้าน | บดละเอียดขึ้น −0.5 ถ้าไม่เปลี่ยน เช็คว่ากระดาษแนบขอบไหม น้ำอาจเลี่ยงชั้นกาแฟไปเลย |
| มีผงลงถ้วย | โดสเกิน **25 g** (ความจุห้องกาแฟ ผงล้น) หรือกระดาษไม่เข้าที่ ล้างกระดาษด้วยน้ำร้อนก่อนเสมอ |

## 5. UI

ภาษาไทยล้วน ใช้ธีมเดิม (design tokens ใน `index.css`, การ์ดมือถือกว้างสุด 480px ใน `App.css`)

### การสลับหน้า

`App.jsx` ถือ state `view` เป็น `'worksheet' | 'timer' | 'fix'`

- header มีปุ่มสลับ 2 ปุ่มตลอดเวลา: **สูตร** และ **แก้รส** กดสลับได้ทุกเมื่อ ไม่ต้องชงเสร็จก่อน
- เข้า `timer` ทางเดียวคือปุ่ม "เริ่มชง" บน RecipeCard ออกด้วยปุ่มย้อนกลับบนหน้า Timer
- input 5 ช่องและ `picks` เก็บไว้ที่ `App.jsx` จึงอยู่ครบเมื่อสลับหน้าไปกลับ (ไม่ persist ข้ามการเปิดแอป)
- หน้า `fix` แสดงตารางของเครื่องที่เลือกอยู่ใน state `device` ปัจจุบัน

### หน้า Worksheet

เลือกเครื่องด้านบน (2 ปุ่ม) ตามด้วย 4 กลุ่มปุ่มเรียงตามลำดับขั้น 1-4 ทุกช่องมีค่าตั้งต้นตามข้อ 4.1 แปลว่าเปิดแอปมาก็เห็นสูตรทันที ไม่ต้องกดอะไรก่อน

ใต้ฟอร์มคือ **RecipeCard** แสดงสูตรที่คำนวณได้ ค่าที่เป็นช่วงจะมี `<input type="range">` ใต้ตัวเลข ให้เลื่อนเลือกก่อนกดเริ่มชง step ของ slider: temp 1°C, grind 0.5, เวลา 5 วิ, bypass 5 g

ค่าเริ่มต้นของ slider คำนวณแบบเดียวกันทุกช่อง: `min + floor((max − min) / 2 / step) * step` คือกลางช่วงปัดลงให้ลงตัวกับ step (เช่น `[40,60]` step 5 → 50 · `[105,120]` step 5 → 110 · `[20,25]` step 5 → 20) `picks` รีเซ็ตกลับเป็นค่าเริ่มต้นใหม่ทุกครั้งที่ input 5 ช่องเปลี่ยน

การ์ดแสดง: กาแฟ, น้ำ (พร้อม ratio หัวเชื้อ), อุณหภูมิ, เบอร์บด Mavo (ทศนิยม เช่น "Mavo 6.0"), เวลาแช่ / pre-infusion + จังหวะกด, bypass (พร้อม ratio สุดท้าย), ฟิลเตอร์, อุณหภูมิตอนดื่ม, และ note ที่สะสมมาจากทั้ง 4 ขั้น รวมข้อความเตือน "หยาบกว่า base" ถ้าเข้าเงื่อนไข

ท้ายหน้าคือ **GrindConverter** ช่องกรอกคลิก C40 หรือ C2 แล้วได้ Mavo

### หน้า Timer

**สัญญาของ `buildTimerSteps(recipe, picks)`** — คืน object เดียว:

```js
{
  steps: [ { name, instruction, duration, startTime }, ... ],
  totalTime
}
```

- `name` — ชื่อ step สั้นๆ ภาษาไทย
- `instruction` — ข้อความเต็มที่ **substitute ค่าจริงมาแล้ว** เป็น string ธรรมดา ไม่ใช่ closure (เลิกใช้ `getInstruction(values)` / `getAmount(values)` ของเดิม เพราะ `picks` ถูก resolve ตั้งแต่ตอนสร้าง step แล้ว)
- `duration` — วินาทีของ step นั้น ใช้แสดงผลใน `TimerStep` เท่านั้น
- `startTime` — **เวลาสะสมแบบ absolute** step แรก = 0 step ถัดไป = ผลรวม `duration` ของ step ก่อนหน้าทั้งหมด — นี่คือ field ที่ `useTimer` ใช้จริงในการหา step ปัจจุบัน
- `totalTime` — ผลรวม `duration` ทั้งหมด ส่งเป็น argument ที่สองของ `useTimer`

AeroPress (4 steps):
1. ใส่กาแฟ เทน้ำถึง {water} g คนเบา 2-3 ที — 15 วิ
2. แช่ — {steep}
3. กลับด้าน กดช้าเบา — {pressDuration}
4. เติม bypass {bypass} g ชิมไปเติมไป — 20 วิ

Delter (7 steps):
1. ใส่ผงกาแฟ เคาะข้างเครื่องให้หน้าผงเรียบ เทน้ำ {water} g ถึงขีด FILL — 20 วิ
2. Pre-infusion: ยกถึงขีด 50 กดจนสุด — 10 วิ
3. รอ — {preinfusionWait}
4. จังหวะ 1: ยกถึงขีด 75 กดช้าๆ — {pressSpeed}
5. พัก — {restBetween}
6. จังหวะ 2: ยกถึงขีด 75 (น้ำที่เหลือ) กดช้าๆ — {pressSpeed}
7. เติม bypass น้ำอุณหภูมิห้อง {bypass} g — 15 วิ

**ชงเสร็จแล้วอยู่หน้าเดิม** เมื่อ `useTimer` คืน `isComplete = true` หน้า Timer แสดงสถานะ "ชงเสร็จแล้ว" พร้อมปุ่มกลับหน้าสูตรและปุ่มชงซ้ำ (`reset`) ไม่มีการเด้งไปหน้าอื่นอัตโนมัติ

`useWakeLock` ขอ `navigator.wakeLock.request('screen')` ตอน timer เริ่มเดิน และ `release()` ตอนหยุด/ออกจากหน้า/unmount พร้อม re-acquire เมื่อ `visibilitychange` กลับมา visible (เบราว์เซอร์ปล่อย lock เองเมื่อสลับแท็บ) ถ้าเบราว์เซอร์ไม่รองรับให้เงียบไป ไม่ต้องแจ้ง error

### หน้าแก้รส

ตารางตามข้อ 4.7 แสดงตามเครื่องที่เลือกอยู่ อ่านอย่างเดียว ไม่มีปุ่ม apply ไม่มี state พร้อมข้อความกำกับเรื่อง dose ที่หัวหน้า

## 6. Error handling

แอปไม่มี I/O ไม่มี network ไม่มี storage จึงไม่มี error path ที่มาจากภายนอก เหลือแค่:

- **input ที่เป็นไปไม่ได้**: ทุกช่องเป็นปุ่มจากรายการปิด และมีค่าตั้งต้นเสมอ จึงไม่มี state ที่ไม่ถูกต้อง `computeRecipe` โยน error ถ้าได้ key ที่ไม่รู้จัก (เป็นบั๊กโปรแกรม ไม่ใช่ input ผู้ใช้) และมีเทสคุม
- **Wake Lock ไม่รองรับ / ถูกปฏิเสธ**: จับ error แล้วเงียบ timer ทำงานต่อปกติ
- **GrindConverter รับค่าว่างหรือไม่ใช่ตัวเลข**: แสดงช่องผลลัพธ์เป็นว่าง ไม่แสดง NaN

## 7. Testing

`src/data/brew.test.js` รันด้วย `node --test` (เพิ่ม `"test": "node --test src/data/*.test.js"` ใน package.json) ไม่เพิ่ม dependency

เทสจับ `computeRecipe`, `toMavo`, `buildTimerSteps` ซึ่งเป็น pure function ทั้งหมด ไม่แตะ React

**"ทุก combo" ในเทสด้านล่างหมายถึงวนครบ 3 roast × 8 process × 3 altitude × 6 origin = 432 กรณีต่อเครื่อง (864 รวมสองเครื่อง)**

1. **Base ตรงตาม Notion** — AeroPress `agtron80_95` + `washed` + `mid` + `colombia` → dose 18, water 190, temp `[88,88]`, grind `[6.0,6.0]`, steep `[105,105]` (washed ทับเป็น 1:45)
2. **ตาราง combo อุณหภูมิตรงทั้ง 6 แถวต่อเครื่อง** — ใช้ตารางข้อ 4.5 เป็น expected value ตรงๆ ตรึง altitude = `mid`, origin = `colombia`
3. **Delter สูงกว่า AeroPress 3°C** — วนทุกคู่ (roast, process) โดย**ตรึง altitude = `mid` และ origin = `colombia`** เทียบสองเครื่องต้องต่างกัน 3 พอดี ยกเว้น `doubleAnaerobic` ที่เทียบเฉพาะปลาย max (ต้องตรึง origin เพราะ `panamaGeisha` ทับ temp เฉพาะ AeroPress และ `kenya` ทับ pressSpeed เฉพาะ Delter จะทำให้เทียบไม่ได้)
4. **`steepAdd` โดนสองรอบ (AeroPress)** — `agtron95plus` + `doubleAnaerobic` + `high` + `thai` → temp `[82,85]`, grind `[5.0,5.5]`, steep `[150,180]` (process ทับเป็น `[120,150]` แล้วบวก 15 จาก roast + 15 จาก altitude)
5. **`preinfusionAdd` และ roast เป็นเจ้าของ preinfusionWait (Delter)** — `agtron95plus` + `washed` + `high` + `colombia` → preinfusionWait `[75,90]` (roast ทับเป็น `[60,75]` process ไม่แตะ แล้วบวก 15 จาก altitude) และ grind `[5.0,5.0]` (roast −0.5 + altitude −0.5) — เทสนี้จะพังทันทีถ้าใครเผลอเติมคอลัมน์ `preinfusionWait` กลับเข้าไปในตาราง Process
6. **Origin ชนะขั้นก่อนหน้า** — AeroPress + `panamaGeisha` + `washed` ให้ temp `[85,87]` (ปกติ washed ได้ 88) แต่ grind ยังเป็น `[6.0,6.0]` และเมื่อเปลี่ยน altitude เป็น `low` grind ต้องขยับเป็น `[6.5,6.5]` — ยืนยันว่า Geisha ไม่กลืนผลของ altitude
7. **Process ชนะ Roast ในการทับ steep** — AeroPress + `agtron65_80` + `washed` ได้ steep `[105,105]` ไม่ใช่ `[105,135]`
8. **temp ทุก combo อยู่ในกรอบที่สมเหตุสมผล** — วนทุก combo ยืนยัน AeroPress อยู่ใน 80-92 และ Delter อยู่ใน 85-94 (แทนที่ clamp ที่ถูกลบออก ถ้าใครพิมพ์เลขผิดใน `brewing-rules.js` เทสนี้จะดังแทนที่จะโดนกลบ)
9. **grind ปัด 0.5 เสมอ** — วนทุก combo ยืนยันว่าทุกค่า `grind.min * 2` และ `grind.max * 2` เป็นจำนวนเต็ม และ `grind.min <= grind.max`
10. **เตือน "หยาบกว่า base" ขึ้นตรงเงื่อนไข** — วนทุก combo ยืนยันว่า note เตือนปรากฏก็ต่อเมื่อ `grind.min > base.grind.min` เท่านั้น และตรวจเคสตัวอย่างสองฝั่ง: AeroPress + `agtron80_95` + `anaerobic` + `low` → grind `[6.5,6.5]` ต้องมีเตือน · เคสเดียวกันแต่ altitude `high` → grind `[5.5,5.5]` ต้องไม่มีเตือน
11. **`ratioFinal` อยู่ในกรอบ** — วนทุก combo ยืนยัน AeroPress ได้ `ratioFinal` ในช่วง **1:13.8 ถึง 1:16.2** และ Delter ได้ **1:15.3 ถึง 1:17.4** ถ้าใครแก้ bypass ใน `brewing-rules.js` แล้ว ratio หลุดกรอบ เทสนี้จับได้

    *กรอบนี้กว้างกว่าที่ Notion เขียนเล็กน้อย (AP 1:14-1:16 · Delter 1:15-1:17) เพราะเลขใน Notion เป็นค่าปัด: AeroPress 18 g กับ bypass 60-100 g ให้ (190+60)/18 = 1:13.9 ถึง (190+100)/18 = 1:16.1 · Delter 15 g กับ bypass 30-60 g ให้ 1:15.3 ถึง 1:17.3 ใช้ค่าที่คำนวณได้จริงเป็นเกณฑ์ ไม่ใช่ค่าปัด*
12. **`toMavo` ปัดถูก** — C40 22 → 6.0, C2 19 → 6.0, ผลลัพธ์ทุกค่าเป็นทวีคูณของ 0.5, และ input ว่าง/NaN คืน `null`
13. **`buildTimerSteps` ใช้ค่าที่เลือกจริงและคำนวณ `startTime` ถูก** — AeroPress ได้ 4 step, Delter ได้ 7 step · duration ของ step "แช่" เท่ากับ `picks.steep` พอดี · Delter step "รอ" เท่ากับ `picks.preinfusionWait` และ step กดทั้งสองจังหวะเท่ากับ `picks.pressSpeed` · `steps[0].startTime === 0` · ทุก step `startTime[i] === startTime[i-1] + duration[i-1]` · `totalTime === ผลรวม duration ทั้งหมด`

*(ไม่ assert เวลารวมเทียบกับ "เวลารวม" ที่ Notion เขียนไว้ (AP 2:00-2:30, Delter 2:20-3:00) เพราะบวกจาก step จริงแล้วไม่ตรง ตัวเลขนั้นเป็นค่าประมาณ การบังคับให้ตรงจะเป็นการล็อกค่าคงที่ใน A5 ไว้กับเลขที่ไม่แน่นอน)*

เทส 3, 8, 9, 10 และ 11 เป็นตัวคุมว่าถ้าใครไปแก้ตัวเลขใน `brewing-rules.js` แล้วทำหลักการพัง จะรู้ทันที ซึ่งเป็นจุดสำคัญเพราะไฟล์นั้นถูกออกแบบมาให้แก้บ่อย

ตรวจด้วยตาเพิ่ม: `bun run build` ต้องผ่าน และเปิดดูบนมือถือจริงหนึ่งรอบก่อนเปิด PR

## 8. สมมติฐานที่ตั้งเอง (ไม่ได้มาจาก Notion ตรงๆ)

| # | สมมติฐาน | เหตุผล |
|---|---|---|
| A1 | ปุ่ม Altitude กลาง = **1,200-1,800** (Notion เขียน 1,500-1,800) | ตาราง Notion มีรู 1,200-1,500 ไม่มีช่องรองรับ ขยาย "กลาง" ลงมาคลุมเพราะกลางแปลว่าไม่ปรับอะไร ปลอดภัยกว่าดันไปฝั่งสูงหรือต่ำ |
| A2 | Agtron 95+ และ 80-95 นับเป็น Light (ฐาน temp 88/91) · 65-80 นับเป็น Medium (ฐาน 90/93) | ตาราง Roast ใน worksheet ใช้ Agtron 3 ช่วง แต่ตารางสูตร temp ใช้คำว่า Light/Medium ต้องเชื่อมสองตารางเข้าหากัน |
| A3 | "steep ยืดนิด" ของ Agtron 95+ = **+15 วิ** | Notion เขียนคำว่า "ยืดนิด" ไม่ได้ให้ตัวเลข ใช้ +15 ให้เท่ากับที่ altitude สูงใช้ |
| A4 | `panamaGeisha` บน AeroPress ทับ **เฉพาะ temp** `[85,87]` ไม่ทับ grind และ steep | callout Geisha ใน Notion ให้ Mavo 6.0 และ steep 1:45 ซึ่งเป็นค่าที่โมเดลคำนวณได้อยู่แล้ว การเขียนทับซ้ำจะไปลบผลของ altitude ทิ้ง (altitude เป็นคุณสมบัติของแหล่งปลูก คนละแกนกับสายพันธุ์) และจะทำให้ steep ที่ทับแล้วยังโดน `steepAdd` บวกทีหลังอยู่ดี ซึ่งย้อนแย้งกับความตั้งใจว่าเป็น "ค่าเบ็ดเสร็จ" ทับเฉพาะ temp ให้ผลตรงกับ callout ทุกกรณีโดยไม่มีผลข้างเคียง |
| A5 | ระยะเวลา step ที่ Notion ไม่ระบุ: เทน้ำ+คน 15 วิ (AP) · ใส่ผง+เทน้ำ 20 วิ (Delter) · กด pre-infusion 10 วิ · เติม bypass 20 วิ (AP) / 15 วิ (Delter) | Notion ให้แค่เวลารวมแบบคร่าวๆ ซึ่งบวกจาก step จริงแล้วไม่ตรง จึงตั้งค่าคงที่เอาเองให้ใช้งานได้จริง เก็บไว้ใน `brewing-rules.js` พร้อมคอมเมนต์ว่าไม่ได้มาจาก Notion แก้ได้ตามใจตอนใช้จริง |
| A6 | ข้อความ note ของ `washed` เขียนกำกับว่าสูตร 18 g / 250 g รวดเดียว (ข้าม bypass) เป็นทางเลือกที่ต้องทำเอง แอปไม่คำนวณให้ | Notion เสนอสูตรนั้นเป็นทางเลือก แต่มันเปลี่ยน `water` ทั้งก้อนซึ่งไม่มี patch ไหนแตะได้ตามกติกา 4.2 การเพิ่ม `water` เข้าไปในกติกาเพื่อรองรับเคสเดียวไม่คุ้ม จึงเขียนกำกับให้ชัดแทนว่าเป็นสูตรที่ต้องทำมือ |
| A7 | บน Delter ตัดคอลัมน์ `preinfusionWait` ออกจากตาราง Process ทั้งหมด ให้ roast เป็นเจ้าของคนเดียว | Notion ระบุ pre-infusion ไว้ทั้งในตาราง Roast และตาราง Process ซึ่งขัดกันเองเมื่อเอามาทำเป็นโมเดลลำดับขั้น ถ้าให้ process ชนะตามกติกาปกติ คอลัมน์ของ roast จะไม่มีทางมีผลเลย เลือกเก็บฝั่งที่มีข้อมูลจริง (roast ต่างกัน 60-75 / 40-60 / 30-40) และทิ้งฝั่งที่แทบเป็น base ซ้ำ (process 40-60 / 40-50 / 40) ผลข้างเคียงที่ยอมรับ: `doubleAnaerobic` เสียการตรึง pre-infusion ที่ 40 วิ ไป |

## 9. สิ่งที่รู้ว่ายังไม่นิ่ง (ไม่แก้ในรอบนี้)

บันทึกไว้เฉยๆ ไม่ต้องทำอะไรในโค้ด เพราะแอปแสดงเลข Mavo เป็นทศนิยมล้วน จึงไม่ได้พึ่งข้อมูลสองข้อนี้

- จำนวนคลิกต่อ 1 เลขบนหน้าปัด Mavo ยังไม่ยืนยัน (AeroPrecipe บอก 120 คลิกรวม = 10 คลิก/เลข · รีวิว Coffee Chronicler บอก 5 คลิก/เลข) Notion มี action item ให้หมุนนับจริงจาก 0 ถึง 1
- เบอร์บด base ของ Delter (6.0) เลือกมาให้ตรงกับ AeroPress เพื่อเทียบเมล็ดเดียวกันสองเครื่อง หลักฐานจริงแตก 2-2 และอาจชี้ไปทางละเอียดกว่านั้นมาก (4.5-5.5) ถ้าชงแล้วบางให้กระโดดไป 5.0 เลย ไม่ต้องขยับทีละ 0.5 — เมื่อ calibrate เสร็จให้แก้เลขเดียวใน `brewing-rules.js`

## 10. เกณฑ์จบงาน

- ลบไฟล์เดิมตามข้อ 3 ครบ ไม่มี import ค้าง
- `node --test` ผ่านทุกเคสตามข้อ 7
- `bun run build` ผ่าน
- เปิด PR เข้า `main` (ไม่ deploy เจ้าของกด deploy เอง)
