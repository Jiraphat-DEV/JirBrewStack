# Firebase Foundation + Google Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** วางโครงสร้าง Firebase (Firestore instance, security rules, emulator, deploy) แล้วต่อ Google login เข้า header ของแอปโดยที่คนไม่ login ยังใช้แอปได้ครบเหมือนเดิม

**Architecture:** งานแบ่งเป็นสองก้อน ก้อนแรกเป็นฝั่ง infra ล้วน (rules ที่มีเทสบน emulator, database instance, CI ที่ deploy rules ได้) ไม่แตะโค้ดแอปสักบรรทัด ก้อนที่สองเพิ่ม Firebase Auth เข้าแอปด้วย hook ตัวเดียวที่ `App.jsx` เรียกแล้วส่งลงเป็น prop ให้ component เดียวคือปุ่มใน header state เดิมของแอปทั้งสามตัว (`input`, `view`, `picks`) ไม่ถูกแตะ

**Tech Stack:** React 18, Vite 5, bun, `firebase@^12` (modular), `@firebase/rules-unit-testing@^5`, `node --test`, Firebase Emulator Suite

**Spec:** [2026-08-07-firebase-auth-design.md](../specs/2026-08-07-firebase-auth-design.md)

## Global Constraints

ทุก task อยู่ใต้ข้อบังคับชุดนี้ทั้งหมด

- Firestore location คือ `asia-southeast1` เลือกครั้งเดียวเปลี่ยนไม่ได้ ถ้าสร้างผิดต้องลบทั้ง database ทิ้ง
- `firebase@^12` เป็น dependency และ `@firebase/rules-unit-testing@^5` เป็น devDependency สองตัวนี้ผูกกันด้วย peer dependency ห้ามข้ามเมเจอร์แยกกัน
- ห้ามสร้างโฟลเดอร์ `functions/` และห้าม deploy `--only functions` (item 12 เป็นคนสร้าง deploy ตอนที่ยังไม่มีฟังก์ชันจะล้มเปล่าๆ)
- ห้ามเปิดหรือทดสอบ environment `prod` ใน `deploy.yml` (secret ว่าง เลือกไปก็ล้มที่ auth) ตัวเลือก `prod` ที่ค้างอยู่เป็นการจงใจ ห้ามลบทิ้ง
- rewrite `{ "source": "**", "destination": "/index.html" }` ของ hosting ต้องอยู่ท้ายสุดของ array `rewrites` เสมอ
- ห้ามมี field `role` ใน Firestore และห้ามมี rule ไหนอ่านค่า `role`
- ตอนไม่ login ทุกอย่างที่ v2 ทำได้ต้องยังทำได้ครบ ห้ามมีอะไรถูกล็อกและห้ามมีป้ายชวนสมัครสักที่
- ห้ามมีจอโหลดคั่นทั้งแอประหว่างรอ auth resolve
- ข้อความที่ผู้ใช้เห็นเป็นภาษาไทยทั้งหมด ตัวแปรและชื่อ field เป็นอังกฤษ
- commit message ห้ามมี trailer `Co-authored-by` ห้ามใช้ emoji และห้ามใช้ emdash ทั้งใน commit message และในโค้ด
- baseline ขนาด bundle ก่อนเริ่มงาน วัดไว้ 2026-08-07: JS 168.03 kB (gzip 55.53 kB), CSS 17.48 kB (gzip 3.51 kB)

## File Structure

| ไฟล์ | หน้าที่ | task |
|---|---|---|
| `firestore.rules` | กฎเข้าถึงข้อมูลทั้งหมด ที่เดียว | 1 |
| `firestore.rules.test.js` | เทส 6 เคสของ `firestore.rules` รันบน emulator | 1 |
| `firestore.indexes.json` | index ของ Firestore ตอนนี้ว่าง | 1 |
| `firebase.json` | เพิ่ม block `firestore` และ `emulators` block `hosting` ไม่แตะ | 1 |
| `package.json` | จำกัดขอบเขต `test` และเพิ่ม `test:rules`, `emulators` | 1 |
| `.gitignore` | เพิ่ม `emulator-data/` | 1 |
| `.github/workflows/deploy.yml` | เปลี่ยน deploy step ให้ deploy rules ได้ด้วย | 2 |
| `src/firebase.js` | init Firebase app แล้ว export `auth` กับ `db` ที่เดียว | 3 |
| `src/hooks/useAuth.js` | ตรรกะ auth ทั้งหมด: subscribe, login, logout, สร้าง user doc | 4 |
| `src/components/AuthButton.jsx` | UI สามสถานะของช่อง auth ใน header ไม่มีตรรกะ auth | 4 |
| `src/components/AuthButton.css` | style ของ `AuthButton` | 4 |
| `src/App.jsx` | เรียก hook แล้ววาง component ใน header เพิ่ม 4 บรรทัด | 4 |

การแบ่ง `useAuth.js` ออกจาก `AuthButton.jsx` คือแบ่งตามความรับผิดชอบ hook ไม่รู้จัก DOM และ component ไม่รู้จัก Firebase เลย component รับแค่ prop 5 ตัวที่เป็นค่าธรรมดา ทำให้เปลี่ยน UI ได้โดยไม่แตะตรรกะ auth และกลับกัน

---

### Task 1: security rules ที่มีเทสรันได้จริงบน emulator

**Files:**
- Create: `firestore.rules`
- Create: `firestore.rules.test.js`
- Create: `firestore.indexes.json`
- Modify: `firebase.json`
- Modify: `package.json`
- Modify: `.gitignore`
- Delete: `firebase-debug.log` (ไฟล์บนเครื่อง ไม่ได้ถูก track ใน git อยู่แล้ว)

**Interfaces:**
- Consumes: ไม่มี เป็น task แรก
- Produces: `firestore.rules` ที่รับประกันแล้วว่า path `users/{uid}` และทุก subcollection ใต้มันเขียนได้เฉพาะเจ้าของ Task 4 พึ่งข้อนี้ตอนเขียน doc `users/{uid}` ผ่าน `ensureUserDoc` และ script `bun run test:rules` ที่ task หลังใช้ยืนยันว่าไม่ทำ rules พัง

- [ ] **Step 1: ติดตั้ง dependency**

```bash
bun add firebase@^12
bun add -d @firebase/rules-unit-testing@^5
```

ยืนยันว่าได้เวอร์ชันที่เข้ากัน `@firebase/rules-unit-testing@5` ประกาศ peer เป็น `firebase@^12` ถ้า bun เตือนเรื่อง peer mismatch ให้หยุดแล้วรายงาน อย่าฝืนไปต่อ

- [ ] **Step 2: เพิ่ม block `firestore` และ `emulators` ใน `firebase.json`**

เขียนทับทั้งไฟล์ด้วยเนื้อหานี้ block `hosting` เหมือนเดิมทุกตัวอักษร

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
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

- [ ] **Step 3: สร้าง `firestore.indexes.json`**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

ว่างเปล่าโดยตั้งใจ ยังไม่มี query ที่ต้องใช้ composite index

- [ ] **Step 4: เพิ่ม script ใน `package.json`**

แก้ block `scripts` ให้เป็น

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test 'src/**/*.test.js'",
    "test:rules": "firebase emulators:exec --only firestore \"node --test firestore.rules.test.js\"",
    "emulators": "firebase emulators:start"
  },
```

`test` ต้องจำกัดให้เจาะจง `src/**/*.test.js` เพราะ `node --test` เปล่าๆ จะกวาดทั้ง repo แล้วไปเจอ `firestore.rules.test.js` ที่รันไม่ได้ถ้าไม่มี emulator เปิดอยู่ รูปแบบ `node --test src/` (โฟลเดอร์เปล่าๆ) ก็ใช้ไม่ได้เช่นกัน เพราะพัง `MODULE_NOT_FOUND` บน node v22.19.0 ต้องเป็น glob pattern ชี้ไฟล์ตรงๆ เทสเดิมสองไฟล์ (`src/data/brew.test.js`, `src/hooks/useTimer.test.js`) อยู่ใน `src/` ทั้งคู่ ไม่กระทบ

`test:rules` ให้ `emulators:exec` เปิด emulator เอง รันเทส แล้วปิดเอง ไม่ต้องเปิด terminal สองอัน

- [ ] **Step 5: เขียนเทสทั้ง 6 เคส**

สร้าง `firestore.rules.test.js` ที่ root ของ repo

```js
import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env;
let alice;
let anon;

before(async () => {
  // host กับ port ไม่ต้องระบุ อ่านจาก FIRESTORE_EMULATOR_HOST ที่ emulators:exec ตั้งให้
  // projectId ต้องตรงกับที่ emulator รันอยู่ (jirbrewstack ใน .firebaserc) เพราะ firebase.json
  // เปิด singleProjectMode ไว้
  env = await initializeTestEnvironment({
    projectId: 'jirbrewstack',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  alice = env.authenticatedContext('alice').firestore();
  anon = env.unauthenticatedContext().firestore();
});

after(() => env.cleanup());

test('ไม่ login อ่าน rulesets/global ได้', async () => {
  // อ่าน doc ที่ยังไม่มีอยู่ก็ยังผ่าน rules และคืน snapshot ที่ exists() เป็น false
  // ซึ่งพอสำหรับสิ่งที่เคสนี้วัด จึงไม่ต้อง seed ข้อมูล
  await assertSucceeds(getDoc(doc(anon, 'rulesets/global')));
});

test('login แล้วเขียน rulesets/global ไม่ได้', async () => {
  await assertFails(setDoc(doc(alice, 'rulesets/global'), { version: 2 }));
});

test('ผู้ใช้ A อ่าน beans ของ B ไม่ได้', async () => {
  await assertFails(getDoc(doc(alice, 'users/bob/beans/b1')));
});

test('ผู้ใช้ A เขียน beans ของ B ไม่ได้', async () => {
  await assertFails(setDoc(doc(alice, 'users/bob/beans/b1'), { name: 'Ethiopia' }));
});

test('ผู้ใช้ A อ่านและเขียน beans ของตัวเองได้', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice/beans/b1'), { name: 'Ethiopia' }));
  await assertSucceeds(getDoc(doc(alice, 'users/alice/beans/b1')));
});

// เคสนี้พิสูจน์ว่า {doc=**} ใน rules version 2 คลุม path ที่ไม่มี segment ต่อท้ายด้วย
// คือคลุม doc users/alice ตัวมันเอง ซึ่ง Task 4 ต้องเขียนตอน login ครั้งแรก
// ถ้าเคสนี้ตก ต้องเปลี่ยน firestore.rules เป็น nested match ตาม design ข้อ 3.2
test('ผู้ใช้ A เขียน doc users/A ตัวมันเองได้', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice'), { displayName: 'Alice' }));
});
```

- [ ] **Step 6: สร้าง `firestore.rules` แบบปิดหมดก่อน เพื่อให้เทสตกอย่างที่ควรตก**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 7: รันเทสแล้วยืนยันว่าตก**

Run: `bun run test:rules`
Expected: 3 เคสตก (`ไม่ login อ่าน rulesets/global ได้`, `ผู้ใช้ A อ่านและเขียน beans ของตัวเองได้`, `ผู้ใช้ A เขียน doc users/A ตัวมันเองได้`) และ 3 เคสผ่าน

ถ้าตกครบ 6 เคสแปลว่า emulator ไม่ได้เชื่อมต่อ ไม่ใช่ rules ทำงาน ให้หยุดแล้วไล่ดูว่า `emulators:exec` ตั้ง `FIRESTORE_EMULATOR_HOST` ให้หรือเปล่า

- [ ] **Step 8: เขียน `firestore.rules` ตัวจริง**

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

    // ไม่มีการอ่าน field role ที่ไหนเลย ถ้าเก็บ role ไว้ใน users/{uid}
    // ผู้ใช้เขียนทับตัวเองเป็น admin ได้ทันที admin เช็คที่ uid ตรงๆ ใน Cloud Function ที่เดียว
    match /users/{uid}/{doc=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 9: รันเทสแล้วยืนยันว่าผ่านครบ**

Run: `bun run test:rules`
Expected: PASS ทั้ง 6 เคส

ถ้าเคสที่ 6 ยังตกอยู่เคสเดียว ให้เปลี่ยน block `users` เป็น nested match แล้วรันใหม่

```
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /{doc=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
```

- [ ] **Step 10: เก็บกวาด log กับ `.gitignore`**

```bash
rm -f firebase-debug.log firestore-debug.log ui-debug.log
```

เพิ่มบรรทัดนี้ท้าย `.gitignore`

```
emulator-data/
```

`*.log` กับ `.firebase/` มีอยู่แล้ว และ `firebase-debug.log` ไม่ได้ถูก track ใน git จึงไม่ต้อง `git rm --cached`

- [ ] **Step 11: ยืนยันว่าไม่ทำของเดิมพัง**

Run: `bun run test`
Expected: PASS เทสเดิมทั้งหมด (`src/data/brew.test.js`, `src/hooks/useTimer.test.js`)

Run: `bun run build`
Expected: JS 168.03 kB (gzip 55.53 kB) และ CSS 17.48 kB (gzip 3.51 kB) เท่าเดิมเป๊ะ ถึงแม้ `firebase` จะอยู่ใน `package.json` แล้วก็ตาม เพราะยังไม่มีโค้ดแอปไหน import มัน ถ้าตัวเลขเปลี่ยนแปลว่ามีอะไร import เข้าไปโดยไม่ตั้งใจ ให้หยุดแล้วไล่หา

- [ ] **Step 12: ยืนยันว่า emulator ขึ้นครบสามตัว**

Run: `bun run emulators`
Expected: ขึ้น auth (9099), firestore (8080), hosting (5000) และ UI โดยไม่มี error แล้วกด Ctrl-C ปิด

- [ ] **Step 13: Commit**

```bash
git add firestore.rules firestore.rules.test.js firestore.indexes.json firebase.json package.json bun.lock .gitignore
git commit -m "Add Firestore security rules with emulator tests"
```

---

### Task 2: Firestore instance จริงกับ CI ที่ deploy rules ได้

**Files:**
- Modify: `.github/workflows/deploy.yml:40-45` (step `Deploy to Firebase Hosting`)

**Interfaces:**
- Consumes: `firestore.rules` และ `firestore.indexes.json` จาก Task 1 และ path ของสองไฟล์นี้ที่ประกาศไว้ใน block `firestore` ของ `firebase.json`
- Produces: Firestore database ที่ `asia-southeast1` ซึ่ง Task 4 เขียน doc `users/{uid}` ลงไปจริง และ CI ที่ deploy ทั้ง `firestore` กับ `hosting` ในคำสั่งเดียว

- [ ] **Step 1: ตรวจก่อนสร้าง ห้ามเดา**

Run: `gcloud firestore databases list --project jirbrewstack`
Expected: `Listed 0 items.`

ถ้าเห็น instance อยู่แล้วให้หยุดทันทีแล้วรายงาน ห้ามสร้างซ้ำและห้ามลบของเดิม

- [ ] **Step 2: สร้าง database**

```bash
gcloud firestore databases create --location=asia-southeast1 --project=jirbrewstack
```

location เป็นการเลือกครั้งเดียวเปลี่ยนไม่ได้ ถ้าพิมพ์ผิดต้องลบทั้ง database ทิ้ง อ่านคำสั่งซ้ำก่อนกด

- [ ] **Step 3: ยืนยันว่าสร้างแล้วจริง**

Run: `gcloud firestore databases list --project jirbrewstack`
Expected: เห็น 1 instance ที่ `locationId: asia-southeast1` และ `type: FIRESTORE_NATIVE`

- [ ] **Step 4: เปลี่ยน deploy step ใน `deploy.yml`**

แทนที่ step สุดท้ายทั้ง step

```yaml
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          projectId: ${{ vars.FIREBASE_PROJECT_ID }}
          channelId: live
```

ด้วย

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

สองจุดที่ห้ามเปลี่ยน

1. secret ส่งผ่าน `env:` ห้าม interpolate `${{ secrets.* }}` ลงใน `run` ตรงๆ เพราะแบบหลังคือเอาเนื้อ secret ไปเป็นส่วนหนึ่งของ shell command ถ้าในนั้นมีอักขระพิเศษจะกลายเป็นคำสั่ง
2. ปัก `firebase-tools@15` ห้ามใช้ `@latest` deploy ที่เคยผ่านต้องผ่านซ้ำได้ ไม่ใช่ขึ้นกับว่าวันนั้น npm มีอะไร

ส่วนอื่นของไฟล์ไม่แตะเลย ยังเป็น `workflow_dispatch` ยังมีตัวเลือก `prod` ค้างไว้ ยังส่ง `VITE_API_URL` กับ `VITE_ENV` ตอน build เหมือนเดิม

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Deploy Firestore rules alongside hosting in CI"
```

- [ ] **Step 6: ให้เจ้าของสั่ง deploy uat แล้วตรวจผล**

push branch ขึ้นไปก่อน แล้วบอกเจ้าของให้สั่ง workflow `Build and Deploy to Firebase (Hosting + Firestore Rules)` แบบ `workflow_dispatch` เลือก environment `uat` (ห้ามเลือก `prod`)

เช็คสามข้อหลัง workflow เขียว
- workflow ผ่านทุก step
- Firebase console ไป Firestore ไป Rules เห็นกฎชุดใหม่ขึ้นไปแล้ว ไม่ใช่ default deny ของ production mode
- เปิด https://jirbrewstack.web.app แล้วแอปทำงานเหมือนเดิมทุกอย่าง ยังไม่มีอะไรที่ผู้ใช้เห็นเปลี่ยน

---

### Task 3: ลงทะเบียน web app กับเปิด Google provider

**Files:**
- Create: `src/firebase.js`

**Interfaces:**
- Consumes: Firestore instance จาก Task 2
- Produces: `export const auth` (ชนิด `Auth` จาก `firebase/auth`) และ `export const db` (ชนิด `Firestore` จาก `firebase/firestore`) ทั้งคู่ import จาก `../firebase.js` Task 4 ใช้ทั้งสองตัว

- [ ] **Step 1: ตรวจว่ายังไม่มี web app**

Run: `firebase apps:list --project jirbrewstack`
Expected: `No apps found.`

project นี้ deploy ผ่าน hosting อย่างเดียวมาตลอด จึงไม่เคยต้องมี app ที่ลงทะเบียน ถ้าเห็น app อยู่แล้วให้ข้าม Step 2 ไปใช้ตัวเดิม

- [ ] **Step 2: สร้าง web app**

```bash
firebase apps:create web JirBrewStack --project jirbrewstack
```

- [ ] **Step 3: ดึง config จริง**

```bash
firebase apps:sdkconfig web --project jirbrewstack
```

เอาค่าที่ได้ไปใช้ใน Step 4 ตรงๆ ห้ามคัดลอกจาก console ด้วยมือและห้ามเดาค่า `apiKey`, `messagingSenderId`, `appId`

- [ ] **Step 4: เขียน `src/firebase.js`**

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ค่าชุดนี้เปิดเผยได้ ไม่ใช่ความลับ ความปลอดภัยอยู่ที่ firestore.rules กับ authorized domain
// ไม่ใช่ที่ apiKey ทำเป็น VITE_* จึงได้แค่ indirection กับโอกาสลืมตั้ง var ตอน deploy
const app = initializeApp({
  apiKey: 'ค่าจาก apps:sdkconfig',
  authDomain: 'ค่าจาก apps:sdkconfig',
  projectId: 'jirbrewstack',
  storageBucket: 'ค่าจาก apps:sdkconfig',
  messagingSenderId: 'ค่าจาก apps:sdkconfig',
  appId: 'ค่าจาก apps:sdkconfig',
});

export const auth = getAuth(app);
export const db = getFirestore(app);
```

ไม่มี `connectAuthEmulator` และไม่มี `connectFirestoreEmulator` local dev ยิงเข้า Firebase จริง (`localhost` เป็น authorized domain อยู่แล้ว) emulator มีไว้เทส rules อย่างเดียว

- [ ] **Step 5: ยืนยันว่า bundle ยังเท่าเดิม**

Run: `bun run build`
Expected: JS 168.03 kB (gzip 55.53 kB) เท่าเดิม เพราะยังไม่มีใคร import `src/firebase.js` vite จึงไม่เอาเข้า bundle

- [ ] **Step 6: ให้เจ้าของเปิด Google provider ใน console**

ไม่มีคำสั่ง CLI สำหรับสองข้อนี้ ต้องกดเองที่ https://console.firebase.google.com/project/jirbrewstack/authentication

1. ไป Sign-in method เปิด provider **Google** อย่างเดียว ตั้ง support email ตอนที่มันถาม ห้ามเปิด Email/Password และห้ามเปิด Anonymous
2. ไป Settings ไป Authorized domains ตรวจว่ามีครบสามตัว `jirbrewstack.web.app`, `jirbrewstack.firebaseapp.com`, `localhost` (ปกติมีมาให้ตั้งแต่แรก)

รอให้เจ้าของยืนยันว่าทำแล้วก่อนไป Task 4 ถ้าข้ามขั้นนี้ `signInWithPopup` จะล้มด้วย `auth/operation-not-allowed`

- [ ] **Step 7: Commit**

```bash
git add src/firebase.js
git commit -m "Add Firebase app initialization"
```

---

### Task 4: ปุ่ม login ใน header

**Files:**
- Create: `src/hooks/useAuth.js`
- Create: `src/components/AuthButton.jsx`
- Create: `src/components/AuthButton.css`
- Modify: `src/App.jsx` (เพิ่ม import 2 บรรทัด, เรียก hook 1 บรรทัด, วาง component 1 บรรทัด)
- Modify: `docs/superpowers/specs/2026-08-07-firebase-auth-design.md` (บันทึกขนาด bundle จริง)

**Interfaces:**
- Consumes: `auth` กับ `db` จาก `src/firebase.js` (Task 3) และ `firestore.rules` ที่อนุญาตให้เจ้าของเขียน doc `users/{uid}` (Task 1)
- Produces: `useAuth()` คืน object `{ user, ready, error, signIn, signOut }` โดย `user` เป็น `User` ของ Firebase หรือ `null`, `ready` เป็น boolean, `error` เป็น string หรือ `null`, `signIn` เป็น `() => Promise<void>`, `signOut` เป็น `() => Promise<void>` item 04 ขึ้นไปจะยกตัวนี้ขึ้นเป็น Context แต่ยังไม่ใช่ตอนนี้

- [ ] **Step 1: เขียน `src/hooks/useAuth.js`**

```js
import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const provider = new GoogleAuthProvider();

// สองอันนี้เงียบ เพราะเป็นเจตนาของผู้ใช้เอง ไม่ใช่ความผิดพลาดที่ต้องรายงาน
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

// getDoc ก่อนแล้วค่อย setDoc เฉพาะตอนยังไม่มี ใช้ setDoc merge อย่างเดียวไม่ได้
// เพราะ createdAt จะถูกเขียนทับทุกรอบที่ login
// เรียกเฉพาะตอน signInWithPopup สำเร็จ ไม่เรียกตอน restore session
// ไม่งั้นเสีย 1 read ทุกครั้งที่รีเฟรชโดยไม่ได้อะไรกลับมา
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  });
}

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setReady(true);
      }),
    [],
  );

  const signIn = async () => {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, provider);
      // ไม่ await เพราะ login สำเร็จไปแล้ว doc นี้เป็นของแถมที่ยังไม่มีใครอ่าน
      // และ subcollection ใน Firestore ไม่ต้องการ parent doc ที่มีอยู่จริง คลังเมล็ดจึงยังทำงานได้ถึงมันจะหาย
      ensureUserDoc(cred.user).catch((e) => console.error('ensureUserDoc', e));
    } catch (e) {
      if (!SILENT.has(e.code)) setError('เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return { user, ready, error, signIn, signOut };
}
```

ไม่ตั้ง persistence เอง Firebase Auth default เป็น `browserLocalPersistence` ซึ่งอยู่ข้ามการรีเฟรชและข้ามการปิดเบราว์เซอร์อยู่แล้ว

- [ ] **Step 2: เขียน `src/components/AuthButton.jsx`**

```jsx
import './AuthButton.css';

export default function AuthButton({ user, ready, error, signIn, signOut }) {
  // ก่อน auth resolve เว้นช่องไว้เฉยๆ การโชว์ปุ่ม "เข้าสู่ระบบ" ตอนนี้
  // คือการโชว์สถานะผิดให้คนที่ login อยู่เห็นราว 100ms
  if (!ready) return <div className="auth" />;

  if (!user) {
    return (
      <div className="auth">
        <button type="button" className="auth__login" onClick={signIn}>
          เข้าสู่ระบบ
        </button>
        {error && (
          <p className="auth__error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const name = user.displayName || 'บัญชีของฉัน';

  return (
    <details className="auth">
      <summary className="auth__summary">
        {user.photoURL ? (
          // ไม่มี referrerPolicy แล้ว lh3.googleusercontent.com คืน 403 เป็นบางเคส
          <img
            className="auth__avatar"
            src={user.photoURL}
            alt={name}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="auth__avatar" aria-label={name}>
            {name.trim().charAt(0)}
          </span>
        )}
      </summary>
      <div className="auth__menu">
        <p className="auth__name">{name}</p>
        <button type="button" className="auth__signout" onClick={signOut}>
          ออกจากระบบ
        </button>
      </div>
    </details>
  );
}
```

`<details>` ปิดด้วยการกด `<summary>` ซ้ำ ไม่มี click-outside-to-close ยอมรับได้เพราะเมนูมีปุ่มเดียว แลกกับการไม่ต้องมี state และได้ keyboard กับ ARIA มาฟรี

- [ ] **Step 3: เขียน `src/components/AuthButton.css`**

ใช้ token เดิมจาก `src/index.css` ทั้งหมด ห้ามฮาร์ดโค้ดสี

```css
/* min-width กันไม่ให้ header กระตุกตอน auth resolve แล้วช่องว่างกลายเป็นปุ่ม */
.auth {
  position: relative;
  display: flex;
  justify-content: flex-end;
  min-width: var(--tap);
}

.auth__login {
  padding: 0 var(--s-3);
  min-height: var(--tap);
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--color-primary);
}

/* ลอยใต้ปุ่ม ไม่ดันเลย์เอาต์ของ header ที่ sticky อยู่ */
.auth__error {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  width: max-content;
  max-width: 60vw;
  margin-top: var(--s-1);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.auth__summary {
  display: flex;
  align-items: center;
  min-height: var(--tap);
  cursor: pointer;
  list-style: none;
}

/* ซ่อนสามเหลี่ยม default ของ summary */
.auth__summary::-webkit-details-marker {
  display: none;
}

.auth__avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.auth__menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  width: max-content;
  min-width: 160px;
  margin-top: var(--s-1);
  padding: var(--s-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.auth__name {
  margin-bottom: var(--s-2);
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.auth__signout {
  min-height: var(--tap);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--color-primary);
}
```

- [ ] **Step 4: ต่อเข้า `src/App.jsx`**

เพิ่ม import สองบรรทัดต่อจาก import ของ `Timer.jsx`

```jsx
import AuthButton from './components/AuthButton.jsx';
import useAuth from './hooks/useAuth.js';
```

เพิ่มบรรทัดนี้ในตัว component ต่อจาก `const [picks, setPicks] = useState(...)`

```jsx
  const authState = useAuth();
```

แล้ววาง component ต่อท้าย `</nav>` ก่อน `</header>`

```jsx
          <AuthButton {...authState} />
```

`.app__header` เป็น `display: flex` กับ `justify-content: space-between` อยู่แล้ว พอมีลูกสามตัวจะกลายเป็น title ซ้าย nav กลาง auth ขวา ซึ่งเป็นเลย์เอาต์ที่ต้องการ ไม่ต้องแก้ CSS ของ `.app__header`

header ซ่อนตัวเองตอน `view === 'timer'` อยู่แล้ว ปุ่ม login จึงหายไปตอนกำลังชงด้วย ซึ่งถูกต้อง state ทั้งสามตัวของแอปไม่ถูกแตะ

- [ ] **Step 5: ยืนยันว่าเทสเดิมยังผ่านและวัด bundle ใหม่**

Run: `bun run test`
Expected: PASS

Run: `bun run test:rules`
Expected: PASS ทั้ง 6 เคส

Run: `bun run build`
Expected: build ผ่าน จดตัวเลข JS และ CSS ทั้งแบบดิบและ gzip ไว้ ตัวเลขนี้จะโตขึ้นเพราะ firebase SDK เข้ามาแล้ว roadmap เดาไว้ราว 150KB gzipped ให้ใช้ตัวเลขจริงที่วัดได้ ไม่ใช่ตัวเลขที่เดาไว้

- [ ] **Step 6: ไล่เช็คด้วยมือบน `bun run dev`**

เปิดหน้าต่าง incognito แล้วไล่ทีละข้อ ทุกข้อต้องผ่านก่อน commit

- [ ] ไม่ login: เลือกเครื่องได้ ปรับ 4 ตัวแปรได้ เห็นการ์ดสูตร เลื่อน slider ได้ กด "เริ่มชง" เข้า timer ได้ เปิดหน้าแก้รสได้ ใช้ตัวแปลงหน่วยบดได้ และไม่เจอป้ายชวนสมัครสักที่
- [ ] header ตอนโหลดหน้าแรก ไม่กระตุกและไม่มีปุ่มโผล่แล้วหาย
- [ ] กด "เข้าสู่ระบบ" แล้วปิด popup ทิ้งกลางคัน: ไม่มีข้อความ error โผล่ แอปใช้งานต่อได้
- [ ] ปิดเน็ต (DevTools ไป Network ไป Offline) แล้วกด "เข้าสู่ระบบ": ขึ้นข้อความสั้นๆ ใต้ปุ่ม ไม่จอขาว แล้วเปิดเน็ตกลับ
- [ ] login สำเร็จ: header กลายเป็นรูปโปรไฟล์ กดแล้วเห็นชื่อกับปุ่ม "ออกจากระบบ" กด summary ซ้ำแล้วเมนูปิด
- [ ] รีเฟรชหน้า: ยัง login อยู่ ปิดเบราว์เซอร์แล้วเปิดใหม่: ยัง login อยู่
- [ ] เปิด Firebase console ไป Firestore: มี doc `users/{uid}` ที่มี `displayName`, `photoURL`, `createdAt` ครบ และไม่มี field `email` กับไม่มี field `role`
- [ ] ออกจากระบบแล้ว login ใหม่: `createdAt` ใน doc เดิมไม่เปลี่ยน
- [ ] เข้าหน้า timer ตอน login อยู่: header หายไปทั้งแถบรวมถึงรูปโปรไฟล์ กด "ย้อนกลับ" แล้วกลับมาครบ

- [ ] **Step 7: บันทึกตัวเลข bundle จริงลง design doc**

แก้หัวข้อ 6 ของ `docs/superpowers/specs/2026-08-07-firebase-auth-design.md` บรรทัดสุดท้ายของส่วน item 03 จาก

```
- บันทึกขนาด bundle หลังเพิ่ม firebase SDK ลงในเอกสารนี้ ไม่ใช่อ้างตัวเลข 150KB ที่ roadmap เดาไว้
```

เป็นตัวเลขจริงที่วัดได้จาก Step 5 เขียนเทียบกับ baseline เช่น `JS 168.03 kB (gzip 55.53 kB) เป็น X kB (gzip Y kB) โตขึ้น Z kB gzipped`

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAuth.js src/components/AuthButton.jsx src/components/AuthButton.css src/App.jsx docs/superpowers/specs/2026-08-07-firebase-auth-design.md
git commit -m "Add Google login button to header"
```

---

## หลังจบทุก task

- [ ] `bun run test` ผ่าน
- [ ] `bun run test:rules` ผ่านครบ 6 เคส
- [ ] `bun run build` ผ่าน
- [ ] push branch แล้วเปิด PR เข้า `feat/v2-worksheet`
- [ ] deploy uat แล้วไล่เช็ค checklist ของ Task 4 Step 6 ซ้ำบน https://jirbrewstack.web.app อีกรอบ (popup flow บน domain จริงต่างจาก localhost)
