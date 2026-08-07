# JirBrewStack v2.1 · Firebase foundation + Google login (Design Spec)

วันที่: 2026-08-07
Branch: `feat/firebase-auth` (แตกจาก `feat/v2-worksheet`)
ครอบคลุม: [item 02 firebase-foundation](2026-08-05-jirbrewstack-v2.1-req/02-firebase-foundation.md), [item 03 google-login](2026-08-05-jirbrewstack-v2.1-req/03-google-login.md)
[กลับไป roadmap](2026-08-05-jirbrewstack-v2.1-roadmap.md)

## 1. ขอบเขต

item 02 วางรางฝั่ง repo ให้ Firestore ใช้ได้ (database instance, rules, emulator, deploy) โดยไม่แตะโค้ดแอปเลย item 03 เอา Firebase Auth ต่อเข้าแอปแล้วมีปุ่ม login ใน header

สองตัวนี้อยู่ใน branch เดียวกันแต่แยก commit เพราะ 02 ไม่มีอะไรที่ผู้ใช้เห็น ถ้า merge เดี่ยวๆ จะไม่มีทางพิสูจน์ว่ามันทำงาน และเพราะ `@firebase/rules-unit-testing` ลาก `firebase` มาเป็น peer dependency อยู่แล้ว ซึ่งเป็น package เดียวกับที่ item 03 ต้องเพิ่ม แยก branch ก็แค่ทำให้ต้องเพิ่มสองรอบ

### ไม่อยู่ในขอบเขต

- ไม่สร้าง `functions/` (item 12 เป็นคนสร้างพร้อมฟังก์ชันตัวแรก deploy `--only functions` ตอนที่ยังไม่มีฟังก์ชันจะล้มเปล่าๆ)
- ไม่เปิด environment `prod` ใน `deploy.yml` (secret ว่าง เลือกไปก็ล้มที่ auth)
- ไม่มีหน้าโปรไฟล์ ไม่มีปุ่มลบบัญชี ไม่เก็บ email
- ไม่ต่อ emulator เข้ากับแอปตอน dev (emulator มีไว้เทส rules อย่างเดียว)
- ไม่ใช้ redirect flow ใช้ popup อย่างเดียว
- ไม่อ่าน `rulesets/global` เข้าแอป (เป็นงานของ item 10)

## 2. ข้อตัดสินที่ล็อกในเอกสารนี้

| หัวข้อ | ตัดสินว่า | เพราะ |
|---|---|---|
| Firestore location | `asia-southeast1` (สิงคโปร์) | ใกล้ไทยที่สุด ~25-40ms เป็น regional ไม่ใช่ multi-region ที่แพงกว่า เจ้าของยืนยันแล้ว 2026-08-07 เลือกครั้งเดียวเปลี่ยนไม่ได้ |
| Firestore mode | Native mode, production rules | ไม่ใช่ test mode ที่เปิดให้ใครก็อ่านเขียนได้ 30 วัน |
| Firebase web config | hardcode ใน `src/firebase.js` | ค่าเปิดเผยได้และมี project เดียว ไม่มี uat/prod แยก ทำเป็น `VITE_*` คือเพิ่ม indirection ให้ค่าที่ไม่มีวันเปลี่ยน แถมพังเงียบตอน deploy ถ้าลืมตั้ง GitHub var |
| auth state | `useAuth()` เรียกที่ `App.jsx` ที่เดียว ส่งลงเป็น prop | ตอนนี้มี consumer เดียวคือ header ยกเป็น Context ตอน item 04 ที่มี consumer ที่สอง |
| `firebase-tools` | ไม่ใส่เป็น devDependency ใช้ CLI global | CI ไม่ได้รันเทส rules และ package หนักเป็นร้อยเมกะไบต์ แลกกับต้องเขียนใน README ว่าคนที่ clone ใหม่ต้องลง CLI เอง |
| เมนู logout | `<details>` กับ `<summary>` ของ browser | ไม่มี state ไม่มี click-outside handler ได้ keyboard กับ ARIA มาฟรี |
| ก่อน auth resolve | ช่อง auth ใน header ว่างไว้ ไม่โชว์ปุ่ม | ทางเลือกอีกทางคือโชว์ "เข้าสู่ระบบ" ก่อนแล้วสลับเป็นรูป ซึ่งคือโชว์สถานะผิดให้คนที่ login อยู่เห็นราว 100ms |

## 3. item 02 · โครงสร้าง Firebase

### 3.1 Firestore database instance

```
gcloud firestore databases create --location=asia-southeast1 --project=jirbrewstack
```

ตรวจก่อนด้วย `gcloud firestore databases list --project jirbrewstack` (ตรวจแล้ววันที่ 2026-08-07 คืน 0 items) API `firestore` เปิดไว้แล้วตั้งแต่ 2026-08-04 ไม่ต้องเปิดซ้ำ

### 3.2 `firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ต้องอ่านได้ตอนไม่ login ไม่งั้นเครื่องคิดเลขพังสำหรับคนที่ไม่มีบัญชี
    // เขียนได้ทางเดียวคือผ่าน Cloud Function ของ item 12
    match /rulesets/global {
      allow read: if true;
      allow write: if false;
    }

    match /users/{uid}/{doc=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

ไม่มี field `role` และไม่มี match ไหนอ่าน `role` ตามที่ roadmap กำหนด ถ้าเก็บ `role: 'admin'` ไว้ใน `users/{uid}` ผู้ใช้เขียนทับตัวเองเป็น admin ได้ทันที admin เช็คที่ uid ตรงๆ ใน Cloud Function ที่เดียว

`request.auth != null` ใส่ไว้ให้อ่านออกชัดๆ ถึงแม้ `null.uid` จะ deny อยู่แล้ว

**จุดที่ต้องพิสูจน์ ห้ามเดา** `{doc=**}` ใน rules version 2 ต้องนับ zero segment ด้วย คือ `match /users/{uid}/{doc=**}` ต้องคลุม doc `users/{uid}` ตัวมันเองที่ item 03 เขียนตอน login ครั้งแรก เทสเคสที่ 6 มีไว้พิสูจน์ข้อนี้ ถ้าตกให้เปลี่ยนเป็น nested match:

```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  match /{doc=**} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

### 3.3 `firestore.indexes.json`

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

ว่างเปล่าโดยตั้งใจ ยังไม่มี query ที่ต้องใช้ composite index (item 07 brew-history เป็นคนแรกที่น่าจะต้องเพิ่ม)

### 3.4 `firebase.json`

เพิ่ม block `firestore` กับ `emulators` block `hosting` ไม่แตะ

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true },
    "singleProjectMode": true
  }
}
```

rewrite `**` ของ hosting ยังอยู่ท้ายสุดและตอนนี้เป็นตัวเดียว วัน item 12 เพิ่ม rewrite ของ function เข้ามา ตัวใหม่ต้องไปอยู่**ก่อน**หน้ามัน ไม่งั้นโดนกลืนทั้งหมด

### 3.5 เทส security rules

ไฟล์ `firestore.rules.test.js` วางที่ root ข้างๆ `firestore.rules` รันด้วย `node --test` ที่มีอยู่แล้ว บวก `@firebase/rules-unit-testing`

```js
import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env;

before(async () => {
  // host กับ port ไม่ต้องระบุ อ่านจาก FIRESTORE_EMULATOR_HOST ที่ emulators:exec ตั้งให้
  env = await initializeTestEnvironment({
    projectId: 'jirbrewstack-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(() => env.cleanup());
```

6 เคส

| # | เคส | คาดหวัง |
|---|---|---|
| 1 | ไม่ login อ่าน `rulesets/global` | ผ่าน |
| 2 | login แล้วเขียน `rulesets/global` | ไม่ผ่าน |
| 3 | ผู้ใช้ A อ่าน `users/B/beans/x` | ไม่ผ่าน |
| 4 | ผู้ใช้ A เขียน `users/B/beans/x` | ไม่ผ่าน |
| 5 | ผู้ใช้ A อ่านและเขียน `users/A/beans/x` | ผ่าน |
| 6 | ผู้ใช้ A เขียน doc `users/A` ตัวมันเอง | ผ่าน |

เคส 1 ถึง 5 มาจาก req ข้อ 4 เคส 6 เพิ่มเองเพื่อพิสูจน์เรื่อง zero segment ในข้อ 3.2 ซึ่ง item 03 พึ่งอยู่

เคส 1 ไม่ต้อง seed ข้อมูล การอ่าน doc ที่ไม่มีอยู่ยังผ่าน rules และคืน snapshot ที่ `exists()` เป็น false ซึ่งนับว่าอ่านได้ตามที่ต้องการวัด

### 3.6 `package.json`

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "node --test src/",
  "test:rules": "firebase emulators:exec --only firestore \"node --test firestore.rules.test.js\"",
  "emulators": "firebase emulators:start"
}
```

`test` ต้องเติม `src/` เข้าไป เพราะ `node --test` เปล่าๆ จะกวาดทั้ง repo แล้วไปเจอ `firestore.rules.test.js` ที่รันไม่ได้ถ้าไม่มี emulator เปิดอยู่ เทสเดิม (`src/data/brew.test.js`, `src/hooks/useTimer.test.js`) อยู่ใน `src/` ทั้งคู่ ไม่กระทบ

`test:rules` ให้ `emulators:exec` เปิด emulator เอง รันเทส แล้วปิดเอง ไม่ต้องเปิด terminal สองอัน `emulators` มีไว้ตอนอยากเปิดค้างเพื่อไล่ดู UI

dependency ที่เพิ่ม: `firebase@^12` (dependency) และ `@firebase/rules-unit-testing@^5` (devDependency) ตัวหลัง peer เป็น `firebase@^12` พอดี ยืนยันแล้ว 2026-08-07 (`@firebase/rules-unit-testing` 5.0.1, `firebase` 12.17.1) commit ของ item 02 เพิ่ม `firebase` เข้า `package.json` แล้วก็จริง แต่ยังไม่มีโค้ดแอปไหน import มัน bundle จึงต้องไม่เปลี่ยน

### 3.7 `.gitignore` และ log ที่ค้าง

`.gitignore` ปัจจุบันมี `*.log` และ `.firebase/` อยู่แล้ว `firebase-debug.log` จึงถูก ignore อยู่แล้วและ **ไม่ได้ถูก track ใน git** (ตรวจด้วย `git ls-files` แล้ว 2026-08-07) เหลือแค่ลบไฟล์บนเครื่องทิ้ง ไม่ต้อง `git rm --cached`

เพิ่มบรรทัดเดียวคือ `emulator-data/` เผื่อวันที่อยากใช้ `--export-on-exit`

### 3.8 `.github/workflows/deploy.yml`

ถอด `FirebaseExtended/action-hosting-deploy` ออก แทนด้วย

```yaml
      - name: Deploy to Firebase
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          FIREBASE_PROJECT_ID: ${{ vars.FIREBASE_PROJECT_ID }}
        run: |
          printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$RUNNER_TEMP/sa.json"
          export GOOGLE_APPLICATION_CREDENTIALS="$RUNNER_TEMP/sa.json"
          bunx firebase-tools@15 deploy \
            --only firestore,hosting \
            --project "$FIREBASE_PROJECT_ID" \
            --non-interactive
```

สองจุดที่ตั้งใจ

- secret ส่งผ่าน `env:` ไม่ใช่ interpolate `${{ secrets.* }}` ลงใน `run` ตรงๆ เพราะแบบหลังคือเอาเนื้อ secret ไปเป็นส่วนหนึ่งของ shell command ถ้าในนั้นมีอักขระพิเศษจะกลายเป็นคำสั่ง
- ปัก `firebase-tools@15` ไม่ใช้ `@latest` deploy ที่เคยผ่านต้องผ่านซ้ำได้ ไม่ใช่ขึ้นกับว่าวันนั้น npm มีอะไร

ส่วนที่ไม่แตะ: ยังเป็น `workflow_dispatch`, ยังมีตัวเลือก `prod` ค้างไว้, ยังส่ง `VITE_API_URL` กับ `VITE_ENV` ตอน build เหมือนเดิม

service account `firebase-adminsdk-fbsvc@jirbrewstack.iam.gserviceaccount.com` มี role `firebase.admin` อยู่แล้ว ซึ่งพอสำหรับ deploy rules ไม่ต้องแตะ IAM (และ `gcloud projects add-iam-policy-binding` โดน permission classifier บล็อกอยู่ ถ้าจำเป็นจริงต้องส่งคำสั่งให้เจ้าของรันเองด้วย `!`)

## 4. item 03 · Google login

### 4.1 `src/firebase.js`

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ค่าชุดนี้เปิดเผยได้ ไม่ใช่ความลับ ความปลอดภัยอยู่ที่ firestore.rules กับ authorized domain
// ไม่ใช่ที่ apiKey ทำเป็น VITE_* จึงได้แค่ indirection กับโอกาสลืมตั้ง var ตอน deploy
const app = initializeApp({
  apiKey: '...',
  authDomain: 'jirbrewstack.firebaseapp.com',
  projectId: 'jirbrewstack',
  storageBucket: 'jirbrewstack.firebasestorage.app',
  messagingSenderId: '...',
  appId: '...',
});

export const auth = getAuth(app);
export const db = getFirestore(app);
```

**project ยังไม่มี web app เลย** ตรวจแล้ว 2026-08-07 ด้วย `firebase apps:list --project jirbrewstack` ได้ `No apps found` เพราะ v2 เป็น static site ที่ deploy ผ่าน hosting อย่างเดียว ไม่เคยต้องมี app ที่ลงทะเบียน ขั้นตอนตอน implement จึงเป็น

```
firebase apps:create web JirBrewStack --project jirbrewstack
firebase apps:sdkconfig web --project jirbrewstack
```

แล้ววางค่าที่ได้ลงไปตรงๆ ไม่ต้องคัดลอกจาก console ด้วยมือ ค่าในบล็อกข้างบนเขียนไว้ให้เห็นรูปร่างเฉยๆ ตัวที่เดาไม่ได้จนกว่าจะสร้าง app คือ `apiKey`, `messagingSenderId`, `appId`

ไม่มี `connectAuthEmulator` / `connectFirestoreEmulator` local dev ยิงเข้า Firebase จริง (`localhost` เป็น authorized domain อยู่แล้ว) แลกกับ Google popup ที่ทำงานเหมือนของจริงตอน dev

### 4.2 `src/hooks/useAuth.js`

คืน `{ user, ready, error, signIn, signOut }`

```js
const provider = new GoogleAuthProvider();

// สองอันนี้เงียบ เพราะเป็นเจตนาของผู้ใช้เอง ไม่ใช่ความผิดพลาดที่ต้องรายงาน
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  });
}
```

- `onAuthStateChanged` subscribe ใน `useEffect` ตัวเดียว cleanup คือ unsubscribe ที่มันคืนมา
- `ready` เป็น false จนกว่า callback แรกจะยิง แล้วเป็น true ตลอดไป
- **`ensureUserDoc` เรียกเฉพาะตอน `signInWithPopup` สำเร็จ ไม่เรียกตอน restore session** ถ้าเรียกทุกครั้งที่ `onAuthStateChanged` ยิง จะเสีย 1 read ทุกครั้งที่รีเฟรชโดยไม่ได้อะไรกลับมา
- `getDoc` ก่อนแล้วค่อย `setDoc` เฉพาะตอนยังไม่มี ตรงตาม req ที่ว่า login ครั้งถัดไปห้ามเขียนทับ `createdAt` (ใช้ `setDoc` merge อย่างเดียวไม่ได้ เพราะ `createdAt` จะถูกเขียนทับทุกรอบ)
- `ensureUserDoc` พังไม่ต้องบอกผู้ใช้ แค่ `console.error` เพราะ doc นี้ยังไม่มีใครอ่าน และ subcollection ใน Firestore ไม่ต้องการ parent doc ที่มีอยู่จริง คลังเมล็ดของ item 04 จึงยังทำงานได้ถึงแม้ doc นี้จะหาย
- ไม่ตั้ง persistence เอง Firebase Auth default เป็น `browserLocalPersistence` ซึ่งอยู่ข้ามการรีเฟรชและข้ามการปิดเบราว์เซอร์อยู่แล้ว ตรงตาม req ข้อ 5

### 4.3 `src/components/AuthButton.jsx`

สามสถานะ

| สถานะ | render |
|---|---|
| `!ready` | `<div className="auth" />` ช่องว่างที่มี `min-width` เท่ากับปุ่ม |
| ไม่ login | ปุ่ม "เข้าสู่ระบบ" บวกข้อความ error ถ้ามี |
| login แล้ว | `<details>` ที่ `<summary>` เป็นรูปโปรไฟล์ ข้างในมีชื่อกับปุ่ม "ออกจากระบบ" |

`<img>` ของรูปโปรไฟล์ต้องมี `referrerPolicy="no-referrer"` ไม่งั้น `lh3.googleusercontent.com` คืน 403 เป็นบางเคส และต้องมี `alt` ที่ fallback เป็นข้อความ ไม่ใช่ `alt=""` เพราะมันเป็นปุ่มเปิดเมนู

`<details>` ปิดด้วยการกด `<summary>` ซ้ำ ไม่มี click-outside-to-close ยอมรับได้ เมนูมีปุ่มเดียว

ข้อความ error วางแบบ `position: absolute` ใต้ปุ่ม ไม่ดันเลย์เอาต์ของ header และมี `role="alert"`

### 4.4 `src/App.jsx`

เพิ่มสองจุด

```jsx
const authState = useAuth();
```

และใน `<header className="app__header">` ต่อท้าย `<nav>`

```jsx
<AuthButton {...authState} />
```

header ปัจจุบันเป็น `display: flex` กับ `justify-content: space-between` มีลูกสองตัวคือ title กับ nav พอเพิ่มตัวที่สามจะกลายเป็น title ซ้าย nav กลาง auth ขวา ซึ่งเป็นเลย์เอาต์ที่ต้องการอยู่แล้ว ไม่ต้องแก้ CSS ของ `.app__header`

header ซ่อนตัวเองตอน `view === 'timer'` อยู่แล้ว ปุ่ม login จึงหายไปตอนกำลังชงด้วย ซึ่งถูกต้อง ระหว่างชงไม่ควรมีทางกดหลุดออกไปไหน

state ทั้งหมดของแอป (`input`, `view`, `picks`) ไม่ถูกแตะเลย ไม่มีอะไรใน worksheet, recipe card, timer, fix table, grind converter ที่อ่านค่า auth

### 4.5 การจัดการ error

| สถานการณ์ | ทำอะไร |
|---|---|
| ผู้ใช้ปิด popup / กด login ซ้ำจนตัวเก่าถูกยกเลิก | เงียบ ไม่แสดงอะไร |
| ไม่มีเน็ต / provider ล่ม / domain ไม่ได้ authorize | ข้อความสั้นใต้ปุ่ม แอปยังใช้ได้ครบ |
| `ensureUserDoc` พัง | `console.error` อย่างเดียว ผู้ใช้ไม่เห็นอะไร |
| auth ยังไม่ resolve | ช่องว่างใน header แอปทั้งหน้าใช้ได้ปกติ ไม่มีจอโหลด |

## 5. งานบน console ที่ต้องกดเอง

ไม่มีคำสั่ง CLI สำหรับสองข้อนี้ เจ้าของต้องกดใน Firebase console เอง ก่อนทดสอบ item 03

1. Authentication ไป Sign-in method เปิด provider **Google** อย่างเดียว ตั้ง support email ตอนที่มันถาม ไม่ต้องเปิด Email/Password และไม่ต้องเปิด Anonymous
2. Authentication ไป Settings ไป Authorized domains ต้องมี `jirbrewstack.web.app`, `jirbrewstack.firebaseapp.com` และ `localhost` (สามตัวนี้ปกติมีมาให้ตั้งแต่แรก ตรวจว่าครบ)

## 6. วัดผล

### item 02

- `firebase emulators:start` ขึ้นครบ auth, firestore, hosting โดยไม่มี error
- `bun run test:rules` ผ่านครบ 6 เคส
- `gcloud firestore databases list --project jirbrewstack` เห็น instance ที่ `asia-southeast1`
- `bun run test` (เทสเดิม) ยังผ่าน
- `bun run build` ได้ขนาดเท่าเดิมเป๊ะ baseline ที่วัดไว้ 2026-08-07 คือ JS 168.03 kB (gzip 55.53 kB) และ CSS 17.48 kB (gzip 3.51 kB)
- deploy uat ด้วยมือแล้วผ่าน เปิด https://jirbrewstack.web.app แล้วแอปเหมือนเดิมทุกอย่าง

### item 03

- incognito ไม่ login: เลือกเครื่อง เลือก 4 ตัวแปร ดูการ์ดสูตร เลื่อน slider เข้า timer ดูตารางแก้รส ใช้ตัวแปลงหน่วยบด ครบทุกอย่าง ไม่เจอป้ายชวนสมัครสักที่
- login สำเร็จแล้วรีเฟรช ยัง login อยู่ ปิดเบราว์เซอร์แล้วเปิดใหม่ ยัง login อยู่
- เช็คใน Firestore มี doc `users/{uid}` ที่มี `displayName`, `photoURL`, `createdAt` ครบ
- login ซ้ำอีกรอบแล้ว `createdAt` ไม่เปลี่ยน
- ปิด popup ทิ้งกลางคัน แอปไม่ค้าง ไม่มีข้อความ error โผล่
- ปิดเน็ตแล้วกด login ขึ้นข้อความบอก ไม่จอขาว
- ผู้ใช้ A อ่าน `users/B` ไม่ได้ (ยืนยันซ้ำกับเทส rules เคส 3)
- ขนาด bundle จริงหลังเพิ่ม firebase SDK (วัด 2026-08-07): JS 168.03 kB (gzip 55.53 kB) เป็น 829.73 kB (gzip 221.31 kB) โตขึ้น 661.70 kB (gzip 165.78 kB) และ CSS 17.48 kB (gzip 3.51 kB) เป็น 18.86 kB (gzip 3.71 kB) โตขึ้น 1.38 kB (gzip 0.20 kB) โตกว่าตัวเลข 150KB gzipped ที่ roadmap เดาไว้

## 7. หนี้ที่ตั้งใจก่อ

| อะไร | เมื่อไหร่ถึงต้องจัดการ |
|---|---|
| ไม่มี Context สำหรับ auth ส่ง `user` เป็น prop | item 04 ที่มี consumer ตัวที่สอง ยกเป็น Context ตอนนั้น |
| `firebase-tools` ไม่อยู่ใน devDependencies | วันที่มีคนที่สองมา clone repo หรือวันที่อยากรันเทส rules ใน CI |
| `<details>` ไม่มี click-outside-to-close | วันที่เมนูมีมากกว่าปุ่มเดียว |
| ไม่มี composite index | item 07 brew-history ที่เริ่ม query จริง |
| doc `users/{uid}` ไม่ถูกสร้างซ่อมถ้าครั้งแรกเขียนพลาด | วันที่มีอะไรอ่าน doc นี้จริงๆ ตอนนี้ยังไม่มี |
