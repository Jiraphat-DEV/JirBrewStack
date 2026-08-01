# JirBrewStack v2 Worksheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire v1 JirBrewStack coffee model with the v2 worksheet calculator from `docs/superpowers/specs/2026-08-01-jirbrewstack-v2-worksheet-design.md`.

**Architecture:** A rule engine with all numbers in one data file (`brewing-rules.js`) and all logic in one pure module (`brew.js`). The UI picks 5 inputs, `computeRecipe()` folds a base object through 4 ordered patch stages into a recipe of `[min, max]` ranges, sliders pick concrete values from those ranges, and `buildTimerSteps()` turns the picks into timer steps. No storage, no router, no network. State lives in `App.jsx`.

**Tech Stack:** React 18.2, Vite 5, plain JavaScript (no TypeScript), Bun as package manager, plain CSS per component using the existing design tokens in `src/index.css`, `node --test` (Node 22) for tests.

## Global Constants

Copy these verbatim into your work. They come straight from the spec.

- **No new dependencies.** `package.json` dependencies stay exactly `react` + `react-dom`. devDependencies stay exactly `@vitejs/plugin-react` + `vite`. Testing uses `node --test` from the stdlib. Wake lock uses `navigator.wakeLock` directly.
- **All UI text is Thai.** No English strings in any user-visible position. Code identifiers stay English.
- **No emoji and no emdash (`—`) anywhere** in code, comments, commit messages, or UI text.
- **Every numeric output is a range `[min, max]`.** A single value is `[n, n]`. This applies to `temp`, `grind`, `steep`, `preinfusionWait`, `pressSpeed`, `restBetween`, `bypass`, `drinkTemp`.
- **The unit for grind is the Mavo Phantox Pro dial number, never clicks.** Always rounded to a multiple of 0.5.
- **Time is displayed as `m:ss`** everywhere (105 seconds shows as `1:45`). Stored internally as plain seconds.
- **Both devices keep separate constants.** Never share a value between `aeropress` and `delter` even when the numbers happen to be equal.
- **`brewing-rules.js` contains no logic and no imports.** It is a plain `export default {...}` object plus comments recording where each number came from.
- **Every value in `brewing-rules.js` must have a real effect.** If editing a value changes nothing, it is a bug.
- Commit on branch `feat/v2-worksheet`. No `Co-authored-by` trailers.
- Run tests with `bun run test`. Run the build with `bun run build`.

---

### Task 1: Rules data file, range normalizer, and whole-file shape guard

**Files:**
- Create: `src/data/brewing-rules.js`
- Create: `src/data/brew.js`
- Create: `src/data/brew.test.js`
- Modify: `package.json` (add the `test` script)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `src/data/brewing-rules.js` default export: `{ defaults, options, fixes, aeropress, delter }` where each device has `{ label, base, sliderBounds, timing, roast, process, altitude, origin }`
  - `src/data/brew.js` named exports: `normalizeRange(value, path) -> [min, max]`, `roundHalf(n) -> number`, and the four field-classification constants `DELTA_FIELDS`, `OVERRIDE_FIELDS`, `ADD_FIELDS`, `RANGE_FIELDS`, `KNOWN_PATCH_FIELDS`

- [ ] **Step 1: Write the failing test**

Create `src/data/brew.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import rules from './brewing-rules.js';
import {
  normalizeRange,
  RANGE_FIELDS,
  KNOWN_PATCH_FIELDS,
} from './brew.js';

const DEVICES = ['aeropress', 'delter'];
const STAGES = ['roast', 'process', 'altitude', 'origin'];

// เทส 16 - รูปร่างของ brewing-rules.js ถูกต้องทั้งไฟล์
test('normalizeRange รับตัวเลขเดี่ยวและช่วง', () => {
  assert.deepStrictEqual(normalizeRange(120), [120, 120]);
  assert.deepStrictEqual(normalizeRange([120, 150]), [120, 150]);
  assert.deepStrictEqual(normalizeRange([-6, -3]), [-6, -3]);
});

test('normalizeRange โยน error พร้อม path เมื่อรูปแบบผิด', () => {
  for (const bad of ['120', [120], [1, 2, 3], [1, NaN], null, undefined, {}]) {
    assert.throws(
      () => normalizeRange(bad, 'aeropress.base.temp'),
      /aeropress\.base\.temp/,
      `ควรโยน error สำหรับ ${JSON.stringify(bad)}`,
    );
  }
  assert.throws(() => normalizeRange([150, 120], 'x.y'), /x\.y/);
});

test('ทุกค่าที่เป็นช่วงใน brewing-rules.js normalize ได้และ min <= max', () => {
  for (const device of DEVICES) {
    for (const [field, value] of Object.entries(rules[device].base)) {
      if (!RANGE_FIELDS.includes(field)) continue;
      const [min, max] = normalizeRange(value, `${device}.base.${field}`);
      assert.ok(min <= max, `${device}.base.${field}`);
    }
    for (const stage of STAGES) {
      for (const [key, patch] of Object.entries(rules[device][stage])) {
        for (const [field, value] of Object.entries(patch)) {
          const path = `${device}.${stage}.${key}.${field}`;
          if (field === 'note') {
            assert.equal(typeof value, 'string', path);
            continue;
          }
          if (field.endsWith('Add')) {
            assert.ok(Number.isFinite(value), path);
            continue;
          }
          const [min, max] = normalizeRange(value, path);
          assert.ok(min <= max, path);
        }
      }
    }
  }
});

test('ทุก key ในทุก patch อยู่ในชุด field ที่รู้จัก', () => {
  for (const device of DEVICES) {
    for (const stage of STAGES) {
      for (const [key, patch] of Object.entries(rules[device][stage])) {
        for (const field of Object.keys(patch)) {
          assert.ok(
            KNOWN_PATCH_FIELDS.includes(field),
            `${device}.${stage}.${key}: ไม่รู้จัก field "${field}"`,
          );
        }
      }
    }
  }
});

test('ทุก sliderBounds มี (max - min) หารด้วย step ลงตัว', () => {
  for (const device of DEVICES) {
    for (const [field, b] of Object.entries(rules[device].sliderBounds)) {
      const steps = (b.max - b.min) / b.step;
      assert.ok(
        Math.abs(Math.round(steps) - steps) < 1e-9,
        `${device}.sliderBounds.${field}: (${b.max} - ${b.min}) / ${b.step} ไม่ลงตัว`,
      );
    }
  }
});

test('ทุกตัวเลือกใน options มีครบทุก stage ของทั้งสองเครื่อง', () => {
  for (const device of DEVICES) {
    for (const stage of STAGES) {
      const keys = rules.options[stage].map((o) => o.key);
      assert.deepStrictEqual(
        Object.keys(rules[device][stage]).sort(),
        [...keys].sort(),
        `${device}.${stage} ไม่ตรงกับ options.${stage}`,
      );
    }
  }
  assert.deepStrictEqual(
    rules.options.device.map((o) => o.key).sort(),
    [...DEVICES].sort(),
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Add the test script to `package.json` first (the `"scripts"` block becomes):

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test src/data/brew.test.js"
  },
```

Run: `bun run test`
Expected: FAIL with `Cannot find module .../src/data/brewing-rules.js`

- [ ] **Step 3: Write `src/data/brew.js` with just the normalizer and constants**

```js
// ตรรกะการคำนวณสูตรทั้งหมด ไม่มี React ไม่มี I/O ทุกฟังก์ชันเป็น pure
// ตัวเลขทั้งหมดอยู่ใน brewing-rules.js ไฟล์นี้ไม่มีตัวเลขของกาแฟเลย

// delta บวกสะสมเข้าไปทั้งสองปลาย
export const DELTA_FIELDS = ['temp', 'grind'];

// ทับค่าเดิมทั้งช่วง ขั้นหลังชนะขั้นก่อน
export const OVERRIDE_FIELDS = [
  'steep',
  'preinfusionWait',
  'pressSpeed',
  'restBetween',
  'bypass',
];

// สะสมแยกจากทุกขั้น แล้วบวกเข้า field ปลายทางครั้งเดียวตอนท้าย
export const ADD_FIELDS = {
  steepAdd: 'steep',
  preinfusionAdd: 'preinfusionWait',
  pressSpeedAdd: 'pressSpeed',
};

// field ที่เก็บเป็นช่วง [min, max] เสมอ
export const RANGE_FIELDS = [
  'temp',
  'grind',
  'steep',
  'preinfusionWait',
  'pressSpeed',
  'restBetween',
  'bypass',
  'drinkTemp',
];

// ชุด key ที่เขียนใน patch ได้ พิมพ์ผิดนอกชุดนี้จะโดนเทส 16 จับ
export const KNOWN_PATCH_FIELDS = [
  ...DELTA_FIELDS,
  ...OVERRIDE_FIELDS,
  ...Object.keys(ADD_FIELDS),
  'tempClamp',
  'note',
];

export const roundHalf = (n) => Math.round(n * 2) / 2;

// รับทั้ง 120 และ [120, 150] ให้ผลเหมือนกัน อย่างอื่นโยน error พร้อม path
// เพื่อให้คนแก้ brewing-rules.js เขียนผิดรูปแล้วรู้ทันที ไม่ใช่ผลเพี้ยนเงียบๆ
export function normalizeRange(value, path = 'value') {
  const pair = Array.isArray(value) ? value : [value, value];
  if (pair.length !== 2) {
    throw new Error(`${path}: ต้องเป็นตัวเลขหรือ [min, max] แต่ได้ ${JSON.stringify(value)}`);
  }
  for (const n of pair) {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new Error(`${path}: ค่าในช่วงต้องเป็นตัวเลข แต่ได้ ${JSON.stringify(value)}`);
    }
  }
  if (pair[0] > pair[1]) {
    throw new Error(`${path}: min มากกว่า max (${pair[0]} > ${pair[1]})`);
  }
  return [pair[0], pair[1]];
}
```

- [ ] **Step 4: Write `src/data/brewing-rules.js`**

Every number below is transcribed from the spec sections 4.1, 4.3, 4.4, 4.7 and section 5. Do not change any of them.

```js
// ตัวเลขและข้อความทั้งหมดของ JirBrewStack v2
// ที่มา: Notion worksheet 2 หน้า
//   AeroPress 39df3937-0750-8177-aa5a-d1bede3ecb95
//   Delter    3aef3937-0750-817e-b5a1-cf891d91f821
// ไฟล์นี้ตั้งใจให้แก้บ่อยโดยไม่ต้องแตะโค้ด ทุกค่าที่นี่มีผลจริง
// ค่าที่เป็นช่วงเขียนได้ทั้ง 90 และ [90, 90] ให้ผลเหมือนกัน
// ค่าคงที่ของสองเครื่องแยกกันเด็ดขาด ห้าม sync เลขข้ามเครื่อง แม้ตัวเลขจะบังเอิญเท่ากัน

const options = {
  device: [
    { key: 'aeropress', label: 'AeroPress' },
    { key: 'delter', label: 'Delter Press' },
  ],
  roast: [
    { key: 'agtron95plus', label: 'Agtron 95+', hint: 'อ่อนมาก' },
    { key: 'agtron80_95', label: 'Agtron 80-95', hint: 'อ่อน' },
    { key: 'agtron65_80', label: 'Agtron 65-80', hint: 'กลาง' },
  ],
  process: [
    { key: 'washed', label: 'Washed' },
    { key: 'honey', label: 'Honey' },
    { key: 'natural', label: 'Natural' },
    { key: 'anaerobic', label: 'Anaerobic' },
    { key: 'cm', label: 'Carbonic Maceration' },
    { key: 'doubleAnaerobic', label: 'Double Anaerobic' },
    { key: 'yeast', label: 'Yeast' },
    { key: 'barrel', label: 'Barrel Aged' },
  ],
  altitude: [
    { key: 'high', label: 'สูง', hint: 'มากกว่า 1,800' },
    { key: 'mid', label: 'กลาง', hint: '1,200-1,800' },
    { key: 'low', label: 'ต่ำ', hint: 'น้อยกว่า 1,200' },
  ],
  origin: [
    { key: 'ethiopia', label: 'เอธิโอเปีย' },
    { key: 'kenya', label: 'เคนยา' },
    { key: 'colombia', label: 'โคลอมเบีย' },
    { key: 'brazil', label: 'บราซิล' },
    { key: 'panamaGeisha', label: 'ปานามา เกอิชา' },
    { key: 'thai', label: 'ไทย' },
  ],
};

const defaults = {
  device: 'aeropress',
  roast: 'agtron80_95',
  process: 'washed',
  altitude: 'mid',
  origin: 'colombia',
};

const aeropress = {
  label: 'AeroPress (inverted)',

  base: {
    dose: 18,
    water: 190, // 1:10.5 ค่ากลางแชมป์ WAC
    temp: 88,
    grind: 6.0, // เลขหน้าปัด Mavo Phantox Pro
    steep: 90, // 1:30
    pressDuration: 30, // กดช้าเบา ไม่มี patch ไหนแตะ
    bypass: [60, 100], // น้ำร้อน
    drinkTemp: [60, 70],
    filter: 'กระดาษ 1 ใบ (ล้างก่อน) ถ้าเป็น fermented หรืออยากได้ clarity ลอง 2 ใบ',
    bloom: 'ไม่ทำ bloom เป็นค่าตั้งต้น เทน้ำครบรวดเดียว คนเบา 2-3 ที',
  },

  // ขอบ slider คือสิ่งที่เครื่องทำได้ ไม่ใช่ช่วงที่แนะนำ
  // กว้างกว่าช่วงที่คำนวณได้เพื่อให้ตารางแก้รสสั่งอะไรก็ทำได้จริง
  sliderBounds: {
    temp: { min: 80, max: 92, step: 1 },
    grind: { min: 5.0, max: 8.0, step: 0.5 },
    steep: { min: 60, max: 180, step: 5 },
    bypass: { min: 40, max: 140, step: 5 },
  },

  // ระยะเวลา step ที่ Notion ไม่ได้ระบุ ตั้งเอง (A5 ในสเปก)
  timing: {
    pour: 15,
    bypassPour: 20,
  },

  roast: {
    agtron95plus: { grind: [-0.5, -0.5], steepAdd: 15 },
    agtron80_95: {},
    agtron65_80: { temp: [2, 2], grind: [0.5, 1.0], steep: [105, 135] },
  },

  process: {
    washed: {
      temp: [0, 0],
      steep: [105, 105],
      note: 'สะอาด เปรี้ยวสดใส เป็น process เดียวที่ข้าม bypass ได้ ถ้าอยากลองให้ชง 18 g ต่อน้ำ 250 g รวดเดียว (1:14) แล้วไม่ต้องเติมน้ำในแก้ว แอปไม่ได้คำนวณสูตรนั้นให้ ต้องทำเอง',
    },
    honey: { temp: [0, 0], note: 'หวานนุ่ม body ดี' },
    natural: { temp: [-1, -1], note: 'รักษาหวานและกลิ่นผลไม้' },
    anaerobic: {
      temp: [-3, -3],
      steep: [105, 120],
      note: 'ละลายเร็ว over ง่าย ถ้าขมให้เพิ่ม bypass ก่อน อย่าเพิ่งบดหยาบ',
    },
    cm: {
      temp: [-3, -3],
      grind: [0, 0.5],
      steep: [105, 120],
      note: 'โบ๊ซและไวน์ ถ้า over จะออกขมแบบยา แนะนำ bypass',
    },
    doubleAnaerobic: {
      temp: [-6, -3],
      grind: [0, 0.5],
      steep: [120, 150],
      note: 'cell wall พังมากสุด over ไวสุด bypass จำเป็น',
    },
    yeast: { temp: [-3, -3], steep: [105, 120], note: 'ผลไม้จัด ระวังโบ๊ซ' },
    barrel: {
      temp: [-3, -3],
      steep: [105, 120],
      note: 'กลิ่นเหล้าระเหยง่าย คนเบาสุด bypass ช่วยให้กลิ่นเหล้าเด่นแบบไม่ขม',
    },
  },

  // Altitude ไม่แตะ temp เด็ดขาด แตะเฉพาะ grind และเวลา
  altitude: {
    high: { grind: [-0.5, -0.5], steepAdd: 15 },
    mid: {},
    low: { grind: [0.5, 0.5] },
  },

  origin: {
    ethiopia: { note: 'ดอกไม้ ซิตรัส เบอร์รี่ ลิ้นจี่ ชา เอา clarity ปลายเย็น' },
    kenya: { note: 'เบอร์รี่และแบล็คเคอแรนต์ เปรี้ยวจัด สะอาด รับ extraction ได้นิดเพื่อ body' },
    colombia: { note: 'บาลานซ์ คาราเมล ผลไม้แดง ใช้ค่าตั้งต้นได้เลย' },
    brazil: { note: 'ถั่ว ช็อกโกแลต เปรี้ยวต่ำ ให้อภัยง่าย ใช้ค่าตั้งต้นหรือเย็นลงนิด' },
    panamaGeisha: {
      // clamp ไม่ใช่ทับ callout ใน Notion นับ barrel-Geisha รวมด้วย ทั้งที่ barrel ปกติได้ 85 อยู่แล้ว
      // แปลว่า 85-87 เป็นทั้งพื้นและเพดาน กันเย็นเกินจนกลิ่นไม่ออก และร้อนเกินจนกลิ่นพัง
      tempClamp: [85, 87],
      bypass: [100, 115], // ให้จบที่ 1:16.1 ถึง 1:16.9 ตามที่ callout กำหนด
      note: 'มะลิ เบอร์กาม็อต พีช ทรอปิคอล คนเบาสุด bypass เยอะเพื่อ clarity',
    },
    thai: { note: 'หลากหลาย ยึด Process เป็นหลัก' },
  },
};

const delter = {
  label: 'Delter Press',

  base: {
    dose: 15,
    water: 200, // 1:13.3 ถึงขาล่างของวงเล็บ FILL พอดี
    temp: 91, // สูงกว่า AeroPress 3 องศา ชดเชยที่ไม่มีการแช่
    grind: 6.0,
    preinfusionMark: 50, // ml บนสเกล PRESS ต่ำสุดของเครื่อง
    strokes: 2, // เปลี่ยนเป็น 3 แล้ว timer เพิ่ม step และแบ่งน้ำใหม่ให้เอง
    restBetween: [15, 20], // ไม่มีขั้นไหนแตะ base เป็นเจ้าของคนเดียว
    yield: 170, // 200 ลบผงดูดซับราว 30 g ใช้เป็นจุดเช็คตาชั่ง
    bypass: [30, 60], // น้ำอุณหภูมิห้อง หน้าที่คือดึงอุณหภูมิถ้วยลง ไม่ใช่ลดขม
    drinkTemp: [60, 70],
    filter: 'กระดาษ Delter 1 ใบ (ล้างก่อน) ห้ามซ้อน 2 ใบ เพราะจะกดฝืด',
    // ไม่มี preinfusionWait และ pressSpeed ใน base โดยตั้งใจ
    // roast กำหนด preinfusionWait ครบทั้ง 3 แถว และ process กำหนด pressSpeed ครบทั้ง 8 แถว
    // ค่าใน base จึงไม่มีวันถูกอ่าน เก็บไว้จะกลายเป็นกับดัก
  },

  sliderBounds: {
    temp: { min: 85, max: 94, step: 1 },
    grind: { min: 4.5, max: 8.0, step: 0.5 },
    preinfusionWait: { min: 20, max: 90, step: 5 },
    pressSpeed: { min: 10, max: 45, step: 5 },
    restBetween: { min: 0, max: 40, step: 5 },
    bypass: { min: 20, max: 90, step: 5 },
  },

  timing: {
    fill: 20,
    preinfusionPress: 10,
    bypassPour: 15,
  },

  // เจ้าของ preinfusionWait แต่ผู้เดียว
  roast: {
    agtron95plus: { grind: [-0.5, -0.5], preinfusionWait: [60, 75] },
    agtron80_95: { preinfusionWait: [40, 60] },
    agtron65_80: { temp: [2, 2], grind: [0.5, 0.5], preinfusionWait: [30, 40] },
  },

  // เจ้าของ pressSpeed แต่ผู้เดียว ไม่มีคอลัมน์ preinfusionWait โดยตั้งใจ
  process: {
    washed: { temp: [0, 0], pressSpeed: [25, 30], note: 'ให้อภัยง่ายสุด เหมาะใช้ calibrate เครื่อง' },
    honey: {
      temp: [0, 0],
      pressSpeed: [25, 30],
      note: 'เครื่องนี้ให้ body น้อยกว่า AeroPress อยู่แล้ว กดช้าไว้',
    },
    natural: { temp: [-1, -1], pressSpeed: [20, 25], note: 'รักษาหวานและกลิ่นผลไม้' },
    anaerobic: {
      temp: [-3, -3],
      pressSpeed: [20, 25],
      note: 'ละลายเร็วแต่ไม่ขมมากบนเครื่องนี้ อย่าเพิ่งรีบลดอะไร',
    },
    cm: {
      temp: [-3, -3],
      grind: [0, 0.5],
      pressSpeed: [20, 25],
      note: 'โบ๊ซและไวน์ ถ้าเปรี้ยวไปให้กดช้าลงก่อน อย่าเพิ่งขึ้น temp',
    },
    doubleAnaerobic: {
      temp: [-5, -3],
      grind: [0, 0.5],
      pressSpeed: [15, 20],
      note: 'แถวเดียวที่กดเร็วได้ over ไวสุด',
    },
    yeast: { temp: [-3, -3], pressSpeed: [20, 25], note: 'ผลไม้จัด ระวังโบ๊ซ' },
    barrel: {
      temp: [-3, -3],
      pressSpeed: [20, 25],
      note: 'เครื่องนี้เหมาะกับ barrel เป็นพิเศษ ไม่มีไอน้ำแช่ไล่กลิ่นเหล้า',
    },
  },

  altitude: {
    high: { grind: [-0.5, -0.5], preinfusionAdd: 15 },
    mid: {},
    low: { grind: [0.5, 0.5] },
  },

  origin: {
    ethiopia: { note: 'ดอกไม้ ซิตรัส เบอร์รี่ ลิ้นจี่ ชา เหมาะกับเครื่องนี้สุด ใช้ค่าตั้งต้นได้เลย' },
    kenya: {
      // บวกท้ายแทนการทับ เพื่อไม่ให้ลบ [15,20] ของ doubleAnaerobic ทิ้ง
      // washed + kenya ได้ [30,35] ตรงกับ Notion พอดี
      pressSpeedAdd: 5,
      note: 'เปรี้ยวจัดอยู่แล้วและเครื่องนี้เปรี้ยวง่าย กดช้ากว่าปกติอีก 5 วิ',
    },
    colombia: { note: 'บาลานซ์ คาราเมล ผลไม้แดง ใช้ค่าตั้งต้นได้เลย' },
    brazil: {
      note: 'ถั่ว ช็อกโกแลต เปรี้ยวต่ำ ให้อภัยง่าย ถ้าอยากลอง 2 จังหวะเร็วให้เลื่อน slider ความเร็วกดไปปลายต่ำ',
    },
    panamaGeisha: {
      bypass: [55, 60],
      note: 'มะลิ เบอร์กาม็อต พีช ทรอปิคอล เติม bypass เยอะให้จบที่ราว 1:17',
    },
    thai: { note: 'หลากหลาย ยึด Process เป็นหลัก' },
  },
};

// ตารางแก้รส ขั้น 5 อ่านอย่างเดียว ทำทีละข้อ ชิมทุกครั้ง หยุดเมื่อดีขึ้น
// AeroPress ขึ้นอาการขมก่อน เพราะเป็น immersion เสี่ยงสกัดเกิน
// Delter ขึ้นอาการบางก่อน เพราะเป็น percolation เสี่ยงสกัดไม่พอ
const fixes = {
  aeropress: [
    {
      symptom: 'ขม ไม่มีกลิ่น แบน',
      steps: [
        'ลด temp 1-2 องศา',
        'ยังขม เพิ่ม bypass อีก 20-30 g',
        'ยังขม คนเบาลง หรือ steep สั้นลง',
        'ยังขม บดหยาบขึ้น +0.5 พร้อมเพิ่มกาแฟ 2 g (หยาบลอยๆ จะกลายเป็นบาง)',
      ],
    },
    {
      symptom: 'เปรี้ยว บาง จืด',
      steps: [
        'บดละเอียดขึ้น -0.5',
        'ยังเปรี้ยว steep นานขึ้น',
        'ยังเปรี้ยว เพิ่ม temp 1-2 องศา',
        'ลด bypass ลง',
      ],
    },
    {
      symptom: 'บางไป ไม่แน่น',
      steps: ['ลด bypass ลง', 'ยังบาง เพิ่มกาแฟเป็น 20 g'],
    },
  ],
  delter: [
    {
      symptom: 'บาง จืด เปรี้ยว ไม่มี body',
      steps: [
        'บดละเอียดขึ้น -0.5 ถึง -1',
        'ยังบาง กดช้าลง ยืดเป็น 30-40 วิต่อจังหวะ',
        'ยังบาง ยืดเวลารอหลัง pre-infusion เป็น 60 วิ และเพิ่มพักระหว่างจังหวะเป็น 30 วิ',
        'ยังบาง ลด bypass แล้วเพิ่มกาแฟเป็น 17-18 g',
      ],
    },
    {
      symptom: 'ขม ฝาด',
      steps: [
        'เช็คก่อนว่ากดฝืดไหม ถ้าฝืดคือต้นเหตุ บดหยาบขึ้น +0.5 แล้วหยุด',
        'ไม่ฝืดแต่ยังขม ลด temp 2-3 องศา',
        'ยังขม เพิ่ม bypass 20-30 g',
        'ยังขม แบ่งเป็น 3 จังหวะแทน 2 (ตั้ง strokes: 3 ใน brewing-rules.js แล้ว timer จะแบ่งน้ำใหม่ให้เอง)',
      ],
    },
    {
      symptom: 'เปรี้ยวแหลมและขมพร้อมกัน',
      steps: [
        'อาการ channeling น้ำเจาะทางเดียว เคาะปรับหน้าผงให้เรียบก่อนกด ยืด pre-infusion กดช้าลง ห้ามฝืน',
        'อาการนี้ไม่มีบน AeroPress เพราะเป็นการแช่เต็มตัว',
      ],
    },
    {
      symptom: 'กดฝืดมาก เครื่องเกือบล้ม',
      steps: [
        'บดหยาบขึ้น +0.5 ถึง +1 ทันที ห้ามฝืน',
        'เช็คว่าโดสไม่เกิน 20 g ซึ่งเป็นเพดานใช้งานก่อนกดฝืด',
        'ใส่กระดาษใบเดียว',
      ],
    },
    {
      symptom: 'น้ำทะลุเร็วผิดปกติ แทบไม่มีแรงต้าน',
      steps: ['บดละเอียดขึ้น -0.5', 'ถ้าไม่เปลี่ยน เช็คว่ากระดาษแนบขอบไหม น้ำอาจเลี่ยงชั้นกาแฟไปเลย'],
    },
    {
      symptom: 'มีผงลงถ้วย',
      steps: [
        'โดสเกิน 25 g ซึ่งเป็นความจุห้องกาแฟ ผงล้นลงถ้วย',
        'หรือกระดาษไม่เข้าที่ ล้างกระดาษด้วยน้ำร้อนก่อนเสมอ',
      ],
    },
  ],
};

export default { defaults, options, fixes, aeropress, delter };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test`
Expected: PASS, 6 tests

- [ ] **Step 6: Commit**

```bash
git add package.json src/data/brewing-rules.js src/data/brew.js src/data/brew.test.js
git commit -m "Add v2 brewing rules data file with whole-file shape guard"
```

---

### Task 2: computeRecipe and the pinned-value tests

**Files:**
- Modify: `src/data/brew.js`
- Modify: `src/data/brew.test.js`

**Interfaces:**
- Consumes: `normalizeRange`, `roundHalf`, `DELTA_FIELDS`, `OVERRIDE_FIELDS`, `ADD_FIELDS`, `RANGE_FIELDS` from Task 1
- Produces: `computeRecipe({ device, roast, process, altitude, origin }) -> recipe` and the exported constant `COARSE_NOTE`. The returned `recipe` carries every key from that device's `base` (with range fields normalized to `[min, max]`), plus `device` (the input string), `ratioConcentrate` (a number), `ratioFinal` (`[min, max]`), and `notes` (an array of strings).

- [ ] **Step 1: Write the failing tests**

Append to `src/data/brew.test.js`:

```js
import { computeRecipe, COARSE_NOTE } from './brew.js';

const recipeOf = (device, roast, process, altitude, origin) =>
  computeRecipe({ device, roast, process, altitude, origin });

// เทส 1 - Base ตรงตาม Notion
test('AeroPress base ตรงตาม Notion', () => {
  const r = recipeOf('aeropress', 'agtron80_95', 'washed', 'mid', 'colombia');
  assert.equal(r.dose, 18);
  assert.equal(r.water, 190);
  assert.deepStrictEqual(r.temp, [88, 88]);
  assert.deepStrictEqual(r.grind, [6.0, 6.0]);
  assert.deepStrictEqual(r.steep, [105, 105]);
});

// เทส 4 - steepAdd โดนสองรอบ
test('steepAdd สะสมจากทั้ง roast และ altitude', () => {
  const r = recipeOf('aeropress', 'agtron95plus', 'doubleAnaerobic', 'high', 'thai');
  assert.deepStrictEqual(r.temp, [82, 85]);
  assert.deepStrictEqual(r.grind, [5.0, 5.5]);
  assert.deepStrictEqual(r.steep, [150, 180]);
});

// เทส 5 - roast เป็นเจ้าของ preinfusionWait แต่ผู้เดียว และ preinfusionAdd บวกทีหลัง
test('Delter preinfusionWait มาจาก roast แล้วบวกด้วย altitude', () => {
  const r = recipeOf('delter', 'agtron95plus', 'washed', 'high', 'colombia');
  assert.deepStrictEqual(r.preinfusionWait, [75, 90]);
  assert.deepStrictEqual(r.grind, [5.0, 5.0]);
});

// เทส 6 - tempClamp เป็นการจำกัดช่วง ไม่ใช่การทับ และไม่กลืน altitude
test('panamaGeisha บน AeroPress บีบ temp เข้ากรอบ 85-87 ทีละปลาย', () => {
  const expected = {
    washed: [87, 87],
    honey: [87, 87],
    natural: [87, 87],
    anaerobic: [85, 85],
    cm: [85, 85],
    doubleAnaerobic: [85, 85],
    yeast: [85, 85],
    barrel: [85, 85],
  };
  for (const [process, temp] of Object.entries(expected)) {
    const r = recipeOf('aeropress', 'agtron80_95', process, 'mid', 'panamaGeisha');
    assert.deepStrictEqual(r.temp, temp, `process ${process}`);
  }
  // ฝั่งเพดาน roast กลาง + washed ปกติได้ 90
  assert.deepStrictEqual(
    recipeOf('aeropress', 'agtron65_80', 'washed', 'mid', 'panamaGeisha').temp,
    [87, 87],
  );
  // clamp แตะเฉพาะ temp altitude ยังมีผลกับ grind ตามปกติ
  assert.deepStrictEqual(
    recipeOf('aeropress', 'agtron80_95', 'washed', 'mid', 'panamaGeisha').grind,
    [6.0, 6.0],
  );
  assert.deepStrictEqual(
    recipeOf('aeropress', 'agtron80_95', 'washed', 'low', 'panamaGeisha').grind,
    [6.5, 6.5],
  );
});

// เทส 7 - Process ชนะ Roast ในการทับ steep
test('process ทับ steep ทับทีหลัง roast', () => {
  const r = recipeOf('aeropress', 'agtron65_80', 'washed', 'mid', 'colombia');
  assert.deepStrictEqual(r.steep, [105, 105]);
});

// เทส 12 - kenya บวกท้าย ไม่ใช่ทับ
test('kenya บวก pressSpeed ท้ายสุด ไม่ลบค่าของ process', () => {
  assert.deepStrictEqual(
    recipeOf('delter', 'agtron80_95', 'washed', 'mid', 'kenya').pressSpeed,
    [30, 35],
  );
  assert.deepStrictEqual(
    recipeOf('delter', 'agtron80_95', 'doubleAnaerobic', 'mid', 'kenya').pressSpeed,
    [20, 25],
  );
});

test('เตือนหยาบกว่า base ขึ้นเมื่อ grind.min มากกว่า base', () => {
  const coarse = recipeOf('aeropress', 'agtron80_95', 'anaerobic', 'low', 'colombia');
  assert.deepStrictEqual(coarse.grind, [6.5, 6.5]);
  assert.ok(coarse.notes.includes(COARSE_NOTE));

  const fine = recipeOf('aeropress', 'agtron80_95', 'anaerobic', 'high', 'colombia');
  assert.deepStrictEqual(fine.grind, [5.5, 5.5]);
  assert.ok(!fine.notes.includes(COARSE_NOTE));
});

test('computeRecipe โยน error เมื่อได้ key ที่ไม่รู้จัก', () => {
  assert.throws(() => recipeOf('frenchpress', 'agtron80_95', 'washed', 'mid', 'colombia'), /frenchpress/);
  assert.throws(() => recipeOf('aeropress', 'agtron80_95', 'espresso', 'mid', 'colombia'), /espresso/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test`
Expected: FAIL with `The requested module './brew.js' does not provide an export named 'computeRecipe'`

- [ ] **Step 3: Implement `computeRecipe` in `src/data/brew.js`**

Add the import at the top of `src/data/brew.js`:

```js
import rules from './brewing-rules.js';
```

Then append:

```js
export const COARSE_NOTE =
  'บดหยาบกว่าค่าตั้งต้นแล้ว ถ้าออกมาบางให้เพิ่มกาแฟ 2 g (หยาบต้องคู่กับเพิ่มโดส ห้ามหยาบเดี่ยวๆ)';

const STAGES = ['roast', 'process', 'altitude', 'origin'];

const clampInto = (v, [lo, hi]) => Math.min(Math.max(v, lo), hi);

function pick(table, key, what) {
  if (!table || !Object.prototype.hasOwnProperty.call(table, key)) {
    throw new Error(`${what}: ไม่รู้จัก "${key}"`);
  }
  return table[key];
}

function scalar(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path}: ต้องเป็นตัวเลข แต่ได้ ${JSON.stringify(value)}`);
  }
  return value;
}

export function computeRecipe(input) {
  const { device } = input;
  const d = pick(rules, device, 'device');

  const out = { device };
  for (const [field, value] of Object.entries(d.base)) {
    out[field] = RANGE_FIELDS.includes(field)
      ? normalizeRange(value, `${device}.base.${field}`)
      : value;
  }

  const notes = [];
  const adds = {};
  let tempClamp = null;

  for (const stage of STAGES) {
    const key = input[stage];
    const patch = pick(d[stage], key, `${device}.${stage}`);
    for (const [field, value] of Object.entries(patch)) {
      const path = `${device}.${stage}.${key}.${field}`;
      if (field === 'note') {
        notes.push(value);
      } else if (field === 'tempClamp') {
        tempClamp = normalizeRange(value, path);
      } else if (field in ADD_FIELDS) {
        const target = ADD_FIELDS[field];
        adds[target] = (adds[target] ?? 0) + scalar(value, path);
      } else if (DELTA_FIELDS.includes(field)) {
        const delta = normalizeRange(value, path);
        out[field] = [out[field][0] + delta[0], out[field][1] + delta[1]];
      } else if (OVERRIDE_FIELDS.includes(field)) {
        out[field] = normalizeRange(value, path);
      } else {
        throw new Error(`${path}: ไม่รู้จัก field "${field}"`);
      }
    }
  }

  // field ประเภทบวกท้ายสะสมจากทุกขั้น แล้วบวกครั้งเดียวหลังสุด
  for (const [field, amount] of Object.entries(adds)) {
    if (!out[field]) {
      throw new Error(`${device}: บวก ${field} ไม่ได้เพราะไม่มีขั้นไหนกำหนดค่าตั้งต้นให้`);
    }
    out[field] = [out[field][0] + amount, out[field][1] + amount];
  }

  // clamp บีบทีละปลาย ไม่ใช่ตัดช่วงทับกัน มิฉะนั้นช่วงที่อยู่นอกกรอบทั้งก้อนจะกลับหัว
  if (tempClamp) {
    out.temp = [clampInto(out.temp[0], tempClamp), clampInto(out.temp[1], tempClamp)];
  }

  out.grind = [roundHalf(out.grind[0]), roundHalf(out.grind[1])];

  for (const field of Object.keys(d.sliderBounds)) {
    if (!out[field]) {
      throw new Error(`${device}: ไม่มีค่า ${field} หลัง apply ครบทุกขั้น`);
    }
  }

  // ratio ของน้ำที่เทเข้า ไม่ใช่ปริมาณน้ำในถ้วย ผงดูดน้ำไว้ราว 2 เท่าของน้ำหนักตัวเอง
  out.ratioConcentrate = out.water / out.dose;
  out.ratioFinal = [
    (out.water + out.bypass[0]) / out.dose,
    (out.water + out.bypass[1]) / out.dose,
  ];

  // บังคับใช้หลักการ "หยาบต้องคู่กับเพิ่มโดส" ในเมื่อแอปปรับ dose ให้เองไม่ได้
  if (out.grind[0] > normalizeRange(d.base.grind)[0]) notes.push(COARSE_NOTE);

  out.notes = notes;
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test`
Expected: PASS, 14 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/brew.js src/data/brew.test.js
git commit -m "Add computeRecipe rule engine with clamp, delta, override and add-at-end patches"
```

---

### Task 3: defaultPicks and the whole-space sweep tests

**Files:**
- Modify: `src/data/brew.js`
- Modify: `src/data/brew.test.js`

**Interfaces:**
- Consumes: `computeRecipe` from Task 2
- Produces: `defaultPick(range, step) -> number` and `defaultPicks(recipe) -> { [field]: number }` (one entry per key in that device's `sliderBounds`)

- [ ] **Step 1: Write the failing tests**

Append to `src/data/brew.test.js`. Note the `ALL_COMBOS` helper is reused by every later sweep test.

```js
import { defaultPick, defaultPicks } from './brew.js';

const ALL_COMBOS = (device) => {
  const out = [];
  for (const roast of Object.keys(rules[device].roast)) {
    for (const process of Object.keys(rules[device].process)) {
      for (const altitude of Object.keys(rules[device].altitude)) {
        for (const origin of Object.keys(rules[device].origin)) {
          out.push({ device, roast, process, altitude, origin });
        }
      }
    }
  }
  return out;
};

const label = (c) => `${c.device}/${c.roast}/${c.process}/${c.altitude}/${c.origin}`;

test('มี 432 combo ต่อเครื่อง', () => {
  assert.equal(ALL_COMBOS('aeropress').length, 432);
  assert.equal(ALL_COMBOS('delter').length, 432);
});

// เทส 2 - ตาราง combo อุณหภูมิที่ Notion เขียนไว้
test('ตาราง combo อุณหภูมิตรงทั้ง 6 แถวต่อเครื่อง', () => {
  const table = [
    ['agtron80_95', 'washed', [88, 88], [91, 91]],
    ['agtron80_95', 'honey', [88, 88], [91, 91]],
    ['agtron80_95', 'natural', [87, 87], [90, 90]],
    ['agtron80_95', 'anaerobic', [85, 85], [88, 88]],
    ['agtron80_95', 'barrel', [85, 85], [88, 88]],
    ['agtron80_95', 'cm', [85, 85], [88, 88]],
    ['agtron80_95', 'yeast', [85, 85], [88, 88]],
    ['agtron80_95', 'doubleAnaerobic', [82, 85], [86, 88]],
    ['agtron65_80', 'washed', [90, 90], [93, 93]],
    ['agtron65_80', 'honey', [90, 90], [93, 93]],
    ['agtron65_80', 'anaerobic', [87, 87], [90, 90]],
  ];
  for (const [roast, process, ap, delterTemp] of table) {
    assert.deepStrictEqual(
      recipeOf('aeropress', roast, process, 'mid', 'colombia').temp,
      ap,
      `aeropress ${roast}/${process}`,
    );
    assert.deepStrictEqual(
      recipeOf('delter', roast, process, 'mid', 'colombia').temp,
      delterTemp,
      `delter ${roast}/${process}`,
    );
  }
});

// เทส 3 - Delter สูงกว่า AeroPress 3 องศา
test('Delter สูงกว่า AeroPress 3 องศาทุกคู่ ยกเว้น doubleAnaerobic ที่เทียบเฉพาะปลาย max', () => {
  for (const roast of Object.keys(rules.aeropress.roast)) {
    for (const process of Object.keys(rules.aeropress.process)) {
      const ap = recipeOf('aeropress', roast, process, 'mid', 'colombia').temp;
      const dp = recipeOf('delter', roast, process, 'mid', 'colombia').temp;
      assert.equal(dp[1] - ap[1], 3, `${roast}/${process} ปลาย max`);
      if (process !== 'doubleAnaerobic') {
        assert.equal(dp[0] - ap[0], 3, `${roast}/${process} ปลาย min`);
      } else {
        assert.equal(dp[0] - ap[0], 4, `${roast}/${process} ปลาย min ต่างกัน 4 โดยตั้งใจ`);
      }
    }
  }
});

// เทส 8 - temp ทุก combo อยู่ในกรอบและไม่กลับหัว
test('temp ทุก combo อยู่ในกรอบและ min ไม่เกิน max', () => {
  for (const device of DEVICES) {
    const b = rules[device].sliderBounds.temp;
    for (const combo of ALL_COMBOS(device)) {
      const { temp } = computeRecipe(combo);
      assert.ok(temp[0] <= temp[1], `${label(combo)} temp กลับหัว ${JSON.stringify(temp)}`);
      assert.ok(temp[0] >= b.min && temp[1] <= b.max, `${label(combo)} temp ${JSON.stringify(temp)}`);
    }
  }
});

// เทส 9 - grind ปัด 0.5 เสมอ
test('grind ทุก combo เป็นทวีคูณของ 0.5 และ min ไม่เกิน max', () => {
  for (const device of DEVICES) {
    for (const combo of ALL_COMBOS(device)) {
      const { grind } = computeRecipe(combo);
      assert.ok(Number.isInteger(grind[0] * 2), `${label(combo)} grind.min ${grind[0]}`);
      assert.ok(Number.isInteger(grind[1] * 2), `${label(combo)} grind.max ${grind[1]}`);
      assert.ok(grind[0] <= grind[1], `${label(combo)} grind กลับหัว`);
    }
  }
});

// เทส 10 - เตือนหยาบกว่า base ขึ้นตรงเงื่อนไขเป๊ะ
test('เตือนหยาบกว่า base ขึ้นก็ต่อเมื่อ grind.min มากกว่า base.grind.min', () => {
  for (const device of DEVICES) {
    const baseGrindMin = normalizeRange(rules[device].base.grind)[0];
    for (const combo of ALL_COMBOS(device)) {
      const r = computeRecipe(combo);
      assert.equal(
        r.notes.includes(COARSE_NOTE),
        r.grind[0] > baseGrindMin,
        `${label(combo)} grind ${JSON.stringify(r.grind)}`,
      );
    }
  }
});

// เทส 11 - ratioFinal อยู่ในกรอบที่คำนวณได้จริง
test('ratioFinal ทุก combo อยู่ในกรอบ', () => {
  const bands = { aeropress: [13.8, 17.0], delter: [15.3, 17.4] };
  for (const device of DEVICES) {
    const [lo, hi] = bands[device];
    for (const combo of ALL_COMBOS(device)) {
      const { ratioFinal } = computeRecipe(combo);
      assert.ok(ratioFinal[0] >= lo, `${label(combo)} ratioFinal.min ${ratioFinal[0]}`);
      assert.ok(ratioFinal[1] <= hi, `${label(combo)} ratioFinal.max ${ratioFinal[1]}`);
    }
  }
});

// เทส 14 - ไม่มี field ไหนหลุด และ slider ครอบทุกค่าที่คำนวณได้
test('ทุก combo ได้ field ครบ อยู่ในขอบ slider และลงกริด step', () => {
  for (const device of DEVICES) {
    const bounds = rules[device].sliderBounds;
    for (const combo of ALL_COMBOS(device)) {
      const r = computeRecipe(combo);
      for (const [field, b] of Object.entries(bounds)) {
        assert.ok(Array.isArray(r[field]), `${label(combo)} ไม่มี ${field}`);
        for (const v of r[field]) {
          assert.ok(v >= b.min && v <= b.max, `${label(combo)} ${field}=${v} หลุดขอบ slider`);
          const grid = (v - b.min) / b.step;
          assert.ok(
            Math.abs(Math.round(grid) - grid) < 1e-9,
            `${label(combo)} ${field}=${v} ไม่ลงกริด step ${b.step}`,
          );
        }
      }
    }
  }
});

test('defaultPick คือกลางช่วงปัดลงให้ลงตัวกับ step', () => {
  assert.equal(defaultPick([40, 60], 5), 50);
  assert.equal(defaultPick([105, 120], 5), 110);
  assert.equal(defaultPick([20, 25], 5), 20);
  assert.equal(defaultPick([88, 88], 1), 88);
  assert.equal(defaultPick([5.0, 6.0], 0.5), 5.5);
});

test('defaultPicks ให้ค่าครบทุก slider และอยู่ในช่วงที่คำนวณได้', () => {
  for (const device of DEVICES) {
    const bounds = rules[device].sliderBounds;
    for (const combo of ALL_COMBOS(device)) {
      const r = computeRecipe(combo);
      const picks = defaultPicks(r);
      assert.deepStrictEqual(Object.keys(picks).sort(), Object.keys(bounds).sort());
      for (const [field, v] of Object.entries(picks)) {
        assert.ok(
          v >= r[field][0] && v <= r[field][1],
          `${label(combo)} ${field}=${v} หลุดช่วง ${JSON.stringify(r[field])}`,
        );
      }
    }
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test`
Expected: FAIL with `does not provide an export named 'defaultPick'`

- [ ] **Step 3: Implement `defaultPick` and `defaultPicks` in `src/data/brew.js`**

```js
// กลางช่วงปัดลงให้ลงตัวกับ step เช่น [40,60] step 5 ได้ 50
export function defaultPick([min, max], step) {
  return min + Math.floor((max - min) / 2 / step) * step;
}

// ค่าเริ่มต้นของทุก slider คิดจากช่วงที่คำนวณได้ ไม่ใช่ขอบ slider
export function defaultPicks(recipe) {
  const bounds = rules[recipe.device].sliderBounds;
  const picks = {};
  for (const [field, b] of Object.entries(bounds)) {
    picks[field] = defaultPick(recipe[field], b.step);
  }
  return picks;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test`
Expected: PASS, 24 tests. Every sweep runs 432 combos per device.

- [ ] **Step 5: Commit**

```bash
git add src/data/brew.js src/data/brew.test.js
git commit -m "Add defaultPicks and sweep tests over all 864 combos"
```

---

### Task 4: Grinder unit conversion

**Files:**
- Modify: `src/data/brew.js`
- Modify: `src/data/brew.test.js`

**Interfaces:**
- Consumes: `roundHalf` from Task 1
- Produces: `toMavo(clicks, grinder) -> number | null` where `grinder` is `'c40'` or `'c2'`, plus `GRINDERS` (an array of `{ key, label, factor, warning }` for the UI to render)

- [ ] **Step 1: Write the failing tests**

Append to `src/data/brew.test.js`:

```js
import { toMavo, GRINDERS } from './brew.js';

// เทส 13 - toMavo ตรงกับตาราง preset ของ Notion ไม่มีค่าชดเชยในสูตร
test('toMavo ตรงกับตาราง preset ของ Notion', () => {
  assert.equal(toMavo(22, 'c40'), 6.0); // 22 * 0.271 = 5.962
  assert.equal(toMavo(19, 'c2'), 6.0); // 19 * 0.320 = 6.08
  assert.equal(toMavo(20, 'c40'), 5.5); // 20 * 0.271 = 5.42
  assert.equal(toMavo(28, 'c2'), 9.0); // 28 * 0.320 = 8.96
});

test('toMavo คืนทวีคูณของ 0.5 เสมอ', () => {
  for (let clicks = 0; clicks <= 60; clicks += 1) {
    for (const { key } of GRINDERS) {
      const v = toMavo(clicks, key);
      assert.ok(Number.isInteger(v * 2), `${key} ${clicks} ได้ ${v}`);
    }
  }
});

test('toMavo คืน null เมื่อ input ว่างหรือไม่ใช่ตัวเลข', () => {
  for (const bad of ['', '   ', null, undefined, 'abc', NaN, Infinity]) {
    assert.equal(toMavo(bad, 'c40'), null, `input ${JSON.stringify(bad)}`);
  }
  assert.equal(toMavo('22', 'c40'), 6.0); // string ที่เป็นตัวเลขยังรับได้
});

test('toMavo โยน error เมื่อไม่รู้จักเครื่องบด', () => {
  assert.throws(() => toMavo(22, 'ek43'), /ek43/);
});

test('GRINDERS มีข้อความเตือนบนเส้นทาง C2', () => {
  const c2 = GRINDERS.find((g) => g.key === 'c2');
  assert.ok(c2.warning.includes('0.69'));
  const c40 = GRINDERS.find((g) => g.key === 'c40');
  assert.equal(c40.warning, '');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test`
Expected: FAIL with `does not provide an export named 'toMavo'`

- [ ] **Step 3: Implement in `src/data/brew.js`**

```js
// ตัวแปลงหน่วยบด ใช้อ่านสูตรจากเน็ตเท่านั้น แอปทำงานด้วยเลขหน้าปัด Mavo ล้วน
// ไม่มีค่าชดเชยในสูตร ทั้งสองเส้นทางตรงตามตาราง preset ของ Notion
export const GRINDERS = [
  { key: 'c40', label: 'Comandante C40 (คลิก)', factor: 0.271, warning: '' },
  {
    key: 'c2',
    label: 'Timemore C2 (คลิก)',
    factor: 0.320,
    warning:
      'เส้นทาง C2 ให้ค่าละเอียดกว่าเส้นทาง C40 เฉลี่ย 0.69 เลข (SD 0.69) ค่าจริงน่าจะหยาบกว่านี้ราวครึ่งเลข ใช้อ่านสูตรเก่าเท่านั้น ห้ามใช้ตั้งค่าจริง',
  },
];

export function toMavo(clicks, grinder) {
  const g = GRINDERS.find((x) => x.key === grinder);
  if (!g) throw new Error(`ไม่รู้จักเครื่องบด "${grinder}"`);
  if (typeof clicks === 'string' && clicks.trim() === '') return null;
  const n = Number(clicks);
  if (clicks === null || clicks === undefined || !Number.isFinite(n)) return null;
  return roundHalf(n * g.factor);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test`
Expected: PASS, 29 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/brew.js src/data/brew.test.js
git commit -m "Add C40 and C2 to Mavo dial conversion"
```

---

### Task 5: Timer step builder and stroke water split

**Files:**
- Modify: `src/data/brew.js`
- Modify: `src/data/brew.test.js`

**Interfaces:**
- Consumes: `computeRecipe`, `defaultPicks` from Tasks 2 and 3
- Produces:
  - `formatTime(seconds) -> string` in `m:ss`
  - `splitStrokes(water, preinfusionMark, strokes) -> number[]` (millilitres per stroke)
  - `buildTimerSteps(recipe, picks) -> { steps, totalTime }` where each step is `{ name, instruction, duration, startTime }`, `instruction` is a plain already-substituted string, and `startTime` is absolute cumulative seconds with `steps[0].startTime === 0`

- [ ] **Step 1: Write the failing tests**

Append to `src/data/brew.test.js`:

```js
import { buildTimerSteps, splitStrokes, formatTime } from './brew.js';

test('formatTime ให้รูปแบบ m:ss', () => {
  assert.equal(formatTime(105), '1:45');
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(9), '0:09');
});

// เทส 15 (ส่วนการแบ่งน้ำ) - เศษไปจังหวะแรก ไม่ใช่จังหวะสุดท้าย
test('splitStrokes แบ่งเป็นหน่วยละ 25 ml แล้วแจกเศษให้จังหวะแรกๆ', () => {
  assert.deepStrictEqual(splitStrokes(200, 50, 2), [75, 75]);
  assert.deepStrictEqual(splitStrokes(200, 50, 3), [50, 50, 50]);
  assert.deepStrictEqual(splitStrokes(200, 50, 4), [50, 50, 25, 25]);
  for (const strokes of [1, 2, 3, 4, 5, 6]) {
    const ml = splitStrokes(200, 50, strokes);
    assert.equal(ml.length, strokes);
    assert.equal(ml.reduce((a, b) => a + b, 0), 150, `strokes ${strokes} ผลรวมต้องเป็น 150`);
  }
});

const stepsFor = (device, overrides = {}) => {
  const combo = { device, roast: 'agtron80_95', process: 'washed', altitude: 'mid', origin: 'colombia' };
  const recipe = { ...computeRecipe(combo), ...overrides };
  const picks = defaultPicks(recipe);
  return { recipe, picks, ...buildTimerSteps(recipe, picks) };
};

// เทส 15 - โครงสร้างและเวลา
test('AeroPress ได้ 4 step และ startTime สะสมถูกต้อง', () => {
  const { steps, totalTime, picks } = stepsFor('aeropress');
  assert.equal(steps.length, 4);
  assert.equal(steps[0].startTime, 0);
  assert.equal(steps[1].duration, picks.steep);
  for (let i = 1; i < steps.length; i += 1) {
    assert.equal(steps[i].startTime, steps[i - 1].startTime + steps[i - 1].duration, `step ${i}`);
  }
  assert.equal(totalTime, steps.reduce((sum, s) => sum + s.duration, 0));
});

test('Delter ได้ 3 + 2 * strokes step และไม่มีพักต่อท้ายจังหวะสุดท้าย', () => {
  for (const strokes of [2, 3]) {
    const { steps, picks } = stepsFor('delter', { strokes });
    assert.equal(steps.length, 3 + 2 * strokes, `strokes ${strokes}`);
    assert.equal(steps[2].duration, picks.preinfusionWait);
    const presses = steps.filter((s) => s.name.startsWith('จังหวะ'));
    const rests = steps.filter((s) => s.name.startsWith('พัก'));
    assert.equal(presses.length, strokes);
    assert.equal(rests.length, strokes - 1);
    for (const s of presses) assert.equal(s.duration, picks.pressSpeed);
    for (const s of rests) assert.equal(s.duration, picks.restBetween);
    assert.ok(steps[steps.length - 1].name.includes('bypass'));
  }
});

test('น้ำต่อจังหวะโผล่ในข้อความของแต่ละจังหวะ', () => {
  const two = stepsFor('delter', { strokes: 2 }).steps.filter((s) => s.name.startsWith('จังหวะ'));
  assert.ok(two[0].instruction.includes('75'));
  assert.ok(two[1].instruction.includes('75'));
  const three = stepsFor('delter', { strokes: 3 }).steps.filter((s) => s.name.startsWith('จังหวะ'));
  for (const s of three) assert.ok(s.instruction.includes('50'));
});

test('instruction เป็น string ที่ substitute ค่ามาแล้ว ไม่ใช่ closure', () => {
  for (const device of DEVICES) {
    for (const s of stepsFor(device).steps) {
      assert.equal(typeof s.name, 'string');
      assert.equal(typeof s.instruction, 'string');
      assert.ok(s.instruction.length > 0);
      assert.ok(Number.isFinite(s.duration) && s.duration > 0, `${s.name} duration`);
    }
  }
});

// เวลารวมไม่นับ step bypass ของ combo ตั้งต้น ต้องลงกรอบที่ Notion เขียน
test('เวลารวมถึงจบการกด (ไม่รวม bypass) ลงกรอบของ Notion', () => {
  const ap = stepsFor('aeropress');
  assert.equal(ap.steps[ap.steps.length - 1].startTime, 150); // 15 + 105 + 30 = 2:30
  const dp = stepsFor('delter');
  assert.equal(dp.steps[dp.steps.length - 1].startTime, 145); // 20 + 10 + 50 + 25 + 15 + 25 = 2:25
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test`
Expected: FAIL with `does not provide an export named 'buildTimerSteps'`

- [ ] **Step 3: Implement in `src/data/brew.js`**

```js
// ponytail: สำเนาเล็กๆ ของ formatTime ที่ useTimer มี เพื่อให้ brew.js ไม่ต้องพึ่ง React
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// แบ่งน้ำเป็นหน่วยละ 25 ml (ขีดที่มีจริงบนสเกล PRESS) แล้วแจกเท่าๆ กัน
// เศษให้จังหวะแรกๆ จังหวะละ 1 หน่วย ถ้ายกไปท้ายจะได้ 25/25/25/75 ที่ 4 จังหวะ
// ซึ่งย้อนแย้งกับเหตุผลที่แบ่งหลายจังหวะตั้งแต่แรก
export function splitStrokes(water, preinfusionMark, strokes) {
  const total = water - preinfusionMark;
  const units = Math.floor(total / 25);
  const per = Math.floor(units / strokes);
  const remainder = units - per * strokes;
  const ml = Array.from({ length: strokes }, (_, i) => (per + (i < remainder ? 1 : 0)) * 25);
  ml[strokes - 1] += total - units * 25;
  return ml;
}

function aeropressSteps(r, p) {
  return [
    {
      name: 'เทน้ำ',
      instruction: `ใส่กาแฟ ${r.dose} g เทน้ำ ${p.temp} องศา ให้ครบ ${r.water} g แล้วคนเบา 2-3 ที`,
      duration: r.timing.pour,
    },
    {
      name: 'แช่',
      instruction: `ปิดฝา แช่ไว้ ${formatTime(p.steep)}`,
      duration: p.steep,
    },
    {
      name: 'กด',
      instruction: 'กลับด้าน กดช้าและเบา อย่าฝืน',
      duration: r.pressDuration,
    },
    {
      name: 'เติม bypass',
      instruction: `เติมน้ำร้อน ${p.bypass} g ชิมไปเติมไป`,
      duration: r.timing.bypassPour,
    },
  ];
}

function delterSteps(r, p) {
  const ml = splitStrokes(r.water, r.preinfusionMark, r.strokes);
  const steps = [
    {
      name: 'เตรียม',
      instruction: `ใส่ผงกาแฟ ${r.dose} g เคาะข้างเครื่องให้หน้าผงเรียบ แล้วเทน้ำ ${p.temp} องศา ${r.water} g ถึงขีด FILL`,
      duration: r.timing.fill,
    },
    {
      name: 'Pre-infusion',
      instruction: `ยกถึงขีด ${r.preinfusionMark} แล้วกดจนสุด`,
      duration: r.timing.preinfusionPress,
    },
    {
      name: 'รอ',
      instruction: `รอให้ผงอิ่มน้ำ ${formatTime(p.preinfusionWait)}`,
      duration: p.preinfusionWait,
    },
  ];
  ml.forEach((amount, i) => {
    if (i > 0) {
      steps.push({
        name: `พัก ${i}`,
        instruction: 'ปล่อยให้น้ำซึมผ่านชั้นกาแฟ อย่าเพิ่งกด',
        duration: p.restBetween,
      });
    }
    steps.push({
      name: `จังหวะ ${i + 1}`,
      instruction: `ยกถึงขีด ${amount} แล้วกดช้าๆ ให้ครบ ${formatTime(p.pressSpeed)}`,
      duration: p.pressSpeed,
    });
  });
  steps.push({
    name: 'เติม bypass',
    instruction: `เติมน้ำอุณหภูมิห้อง ${p.bypass} g`,
    duration: r.timing.bypassPour,
  });
  return steps;
}

// useTimer หา step ปัจจุบันจาก startTime แบบสะสม (absolute) และไม่อ่าน duration เลย
export function buildTimerSteps(recipe, picks) {
  const raw = recipe.device === 'aeropress'
    ? aeropressSteps(recipe, picks)
    : delterSteps(recipe, picks);
  let elapsed = 0;
  const steps = raw.map((step) => {
    const withStart = { ...step, startTime: elapsed };
    elapsed += step.duration;
    return withStart;
  });
  return { steps, totalTime: elapsed };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test`
Expected: PASS, 36 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/brew.js src/data/brew.test.js
git commit -m "Add buildTimerSteps and stroke water split"
```

---

### Task 6: Delete v1 and build the new App shell

This task leaves the app in a working but skeletal state: the header nav switches views and each view renders a one-line placeholder. Tasks 7 to 11 fill them in.

**Files:**
- Delete: `src/data/recipes.js`, `src/data/dialInLogic.js`, `src/hooks/useBrewHistory.js`, `src/hooks/useLocalStorage.js`
- Delete: `src/components/{BeanTypeSelector,BrewHistory,Calculator,DialInAssistant,FeedbackSlider,GrindDisplay,InputField,MethodSelector,RoastSelector,SaveRecipeModal,StarRating,StrengthSlider,Timer,TimerStep}.jsx` and the matching `.css` for all of them **except** keep `Timer.css` and `TimerStep.css` (Task 11 reuses them)
- Modify: `src/App.jsx` (rewrite), `src/App.css`, `index.html`
- Keep untouched: `src/hooks/useTimer.js`, `src/main.jsx`, `src/index.css`, `vite.config.js`, `firebase.json`, `.firebaserc`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `computeRecipe`, `defaultPicks` from Tasks 2 and 3; `rules.defaults` from Task 1
- Produces: `App` holds `input` (`{ device, roast, process, altitude, origin }`), `picks`, and `view` (`'worksheet' | 'timer' | 'fix'`). It passes `onChange(field, value)` to Worksheet, `onPick(field, value)` and `onStart()` to RecipeCard, and `onBack()` to Timer. Changing any of the 5 inputs resets `picks` to `defaultPicks` of the new recipe.

- [ ] **Step 1: Delete every v1 file**

```bash
git rm src/data/recipes.js src/data/dialInLogic.js \
       src/hooks/useBrewHistory.js src/hooks/useLocalStorage.js \
       src/components/BeanTypeSelector.jsx src/components/BeanTypeSelector.css \
       src/components/BrewHistory.jsx src/components/BrewHistory.css \
       src/components/Calculator.jsx src/components/Calculator.css \
       src/components/DialInAssistant.jsx src/components/DialInAssistant.css \
       src/components/FeedbackSlider.jsx src/components/FeedbackSlider.css \
       src/components/GrindDisplay.jsx src/components/GrindDisplay.css \
       src/components/InputField.jsx src/components/InputField.css \
       src/components/MethodSelector.jsx src/components/MethodSelector.css \
       src/components/RoastSelector.jsx src/components/RoastSelector.css \
       src/components/SaveRecipeModal.jsx src/components/SaveRecipeModal.css \
       src/components/StarRating.jsx src/components/StarRating.css \
       src/components/StrengthSlider.jsx src/components/StrengthSlider.css \
       src/components/Timer.jsx src/components/TimerStep.jsx
```

- [ ] **Step 2: Verify nothing references the deleted files**

Run: `rg -n "recipes|dialInLogic|useBrewHistory|useLocalStorage|BeanTypeSelector|BrewHistory|Calculator|DialInAssistant|FeedbackSlider|GrindDisplay|InputField|MethodSelector|RoastSelector|SaveRecipeModal|StarRating|StrengthSlider" src/`
Expected: only hits inside `src/App.jsx`, which the next step replaces entirely.

- [ ] **Step 3: Rewrite `src/App.jsx`**

```jsx
import { useState } from 'react';
import rules from './data/brewing-rules.js';
import { computeRecipe, defaultPicks } from './data/brew.js';
import './App.css';

export default function App() {
  const [input, setInput] = useState(rules.defaults);
  const [view, setView] = useState('worksheet');
  const [picks, setPicks] = useState(() => defaultPicks(computeRecipe(rules.defaults)));

  // computeRecipe เป็น pure และเบา คำนวณใหม่ทุก render ได้ ไม่ต้อง memo
  const recipe = computeRecipe(input);

  // เปลี่ยน input ช่องไหนก็ตาม picks รีเซ็ตกลับเป็นค่าเริ่มต้นของสูตรใหม่
  const changeInput = (field, value) => {
    const next = { ...input, [field]: value };
    setInput(next);
    setPicks(defaultPicks(computeRecipe(next)));
  };

  const changePick = (field, value) => setPicks((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">JirBrewStack</h1>
        <nav className="app__nav">
          <button
            type="button"
            className={`app__nav-btn${view === 'worksheet' ? ' app__nav-btn--active' : ''}`}
            onClick={() => setView('worksheet')}
          >
            สูตร
          </button>
          <button
            type="button"
            className={`app__nav-btn${view === 'fix' ? ' app__nav-btn--active' : ''}`}
            onClick={() => setView('fix')}
          >
            แก้รส
          </button>
        </nav>
      </header>

      <main className="app__main">
        {view === 'timer' && <p>ตัวจับเวลา (ยังไม่ได้ทำ)</p>}
        {view === 'fix' && <p>ตารางแก้รส (ยังไม่ได้ทำ)</p>}
        {view === 'worksheet' && (
          <p>
            {rules[input.device].label} · {recipe.dose} g · {recipe.water} g ·{' '}
            {recipe.temp.join('-')} องศา · Mavo {recipe.grind.join('-')} · pick{' '}
            {JSON.stringify(picks)}
          </p>
        )}
      </main>
    </div>
  );
}
```

`changePick` and `setView('timer')` are unused until Task 8. Leave them in place; the next tasks wire them up.

- [ ] **Step 4: Replace the history button style in `src/App.css` with nav styles**

Replace the whole `.app__history-btn` and `.app__history-btn:hover` block with:

```css
.app__nav {
  position: absolute;
  right: 0;
  display: flex;
  gap: 6px;
}

.app__nav-btn {
  padding: 8px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);
  min-height: 36px;
}

.app__nav-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
```

- [ ] **Step 5: Update `index.html`**

Both the `<title>` and the meta description still describe v1 and mention Timemore C2. Replace those two lines with:

```html
    <meta name="description" content="JirBrewStack - เครื่องคำนวณสูตรกาแฟ AeroPress และ Delter Press พร้อมตัวจับเวลาและตารางแก้รส" />
```

```html
    <title>JirBrewStack - สูตรกาแฟ</title>
```

Also change `<html lang="en">` to `<html lang="th">`.

- [ ] **Step 6: Verify the build and tests still pass**

Run: `bun run test && bun run build`
Expected: tests PASS, build succeeds with no unresolved import errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove v1 coffee model and replace App shell with v2 view switching"
```

---

### Task 7: Worksheet input selectors

**Files:**
- Create: `src/components/Worksheet.jsx`, `src/components/Worksheet.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `rules.options` from Task 1; `changeInput` from Task 6
- Produces: `<Worksheet input={input} onChange={changeInput} />`, where `onChange` is called as `onChange(field, optionKey)`

- [ ] **Step 1: Create `src/components/Worksheet.css`**

```css
.worksheet {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.worksheet__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.worksheet__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.worksheet__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  min-height: 44px;
  transition: all var(--transition-fast);
}

.worksheet__option--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.worksheet__option-hint {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.worksheet__option--active .worksheet__option-hint {
  color: rgba(255, 255, 255, 0.75);
}
```

- [ ] **Step 2: Create `src/components/Worksheet.jsx`**

```jsx
import rules from '../data/brewing-rules.js';
import './Worksheet.css';

// เรียงตามลำดับขั้น 1-4 ใน worksheet โดยมีเครื่องอยู่บนสุด
const GROUPS = [
  { field: 'device', label: 'เครื่อง' },
  { field: 'roast', label: 'ระดับคั่ว' },
  { field: 'process', label: 'Process' },
  { field: 'altitude', label: 'ความสูง (masl)' },
  { field: 'origin', label: 'แหล่งปลูก' },
];

export default function Worksheet({ input, onChange }) {
  return (
    <section className="worksheet">
      {GROUPS.map(({ field, label }) => (
        <div key={field}>
          <h2 className="worksheet__label">{label}</h2>
          <div className="worksheet__options">
            {rules.options[field].map((option) => {
              const active = input[field] === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={active}
                  className={`worksheet__option${active ? ' worksheet__option--active' : ''}`}
                  onClick={() => onChange(field, option.key)}
                >
                  <span>{option.label}</span>
                  {option.hint && <span className="worksheet__option-hint">{option.hint}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Wire it into `src/App.jsx`**

Add the import:

```jsx
import Worksheet from './components/Worksheet.jsx';
```

Replace the `view === 'worksheet'` placeholder block with:

```jsx
        {view === 'worksheet' && (
          <>
            <Worksheet input={input} onChange={changeInput} />
            <p>
              {recipe.dose} g · {recipe.water} g · {recipe.temp.join('-')} องศา · Mavo{' '}
              {recipe.grind.join('-')}
            </p>
          </>
        )}
```

- [ ] **Step 4: Verify by eye**

Run: `bun run dev` and open the local URL on a narrow window.
Expected: five labelled groups of buttons, one highlighted per group, and the summary line changes when you tap a different option. Every button is at least 44px tall.

- [ ] **Step 5: Verify the build**

Run: `bun run build`
Expected: succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/Worksheet.jsx src/components/Worksheet.css src/App.jsx
git commit -m "Add Worksheet input selectors"
```

---

### Task 8: RecipeCard with range sliders

**Files:**
- Create: `src/components/RecipeCard.jsx`, `src/components/RecipeCard.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `rules[device].sliderBounds` from Task 1, `formatTime` from Task 5, `changePick` and `setView('timer')` from Task 6
- Produces: `<RecipeCard recipe={recipe} picks={picks} onPick={changePick} onStart={() => setView('timer')} />`

- [ ] **Step 1: Create `src/components/RecipeCard.css`**

```css
.recipe {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.recipe__facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.recipe__fact-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recipe__fact-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-primary);
}

.recipe__fact-note {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.recipe__slider-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.recipe__slider-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.recipe__slider-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* ต้องเจาะจงกว่า input[type="range"] ใน index.css จึงจะทับพื้นหลังได้ */
input[type='range'].recipe__slider {
  margin: 6px 0 2px;
  background: linear-gradient(
    to right,
    var(--color-border) 0 var(--band-start),
    var(--color-accent) var(--band-start) var(--band-end),
    var(--color-border) var(--band-end) 100%
  );
}

.recipe__slider-hint {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.recipe__statics {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.recipe__notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.recipe__note--warning {
  color: var(--color-warning);
  font-weight: 600;
}

.recipe__start {
  padding: 16px;
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  min-height: 56px;
  transition: all var(--transition-fast);
}

.recipe__start:hover {
  background: var(--color-accent);
}
```

- [ ] **Step 2: Create `src/components/RecipeCard.jsx`**

```jsx
import rules from '../data/brewing-rules.js';
import { formatTime, COARSE_NOTE } from '../data/brew.js';
import './RecipeCard.css';

const oneDecimal = (v) => v.toFixed(1);

// field ที่ตั้งค่าจริงบนอุปกรณ์ได้มี slider ทุกตัว ค่าที่เป็นเป้าหมายหรือผลลัพธ์ไม่มี
const SLIDERS = {
  aeropress: [
    { field: 'temp', label: 'อุณหภูมิน้ำ', format: (v) => `${v} องศา` },
    { field: 'grind', label: 'เบอร์บด (Mavo)', format: oneDecimal },
    { field: 'steep', label: 'เวลาแช่', format: formatTime },
    { field: 'bypass', label: 'bypass (น้ำร้อน)', format: (v) => `${v} g` },
  ],
  delter: [
    { field: 'temp', label: 'อุณหภูมิน้ำ', format: (v) => `${v} องศา` },
    { field: 'grind', label: 'เบอร์บด (Mavo)', format: oneDecimal },
    { field: 'preinfusionWait', label: 'รอหลัง pre-infusion', format: formatTime },
    { field: 'pressSpeed', label: 'ความเร็วกดต่อจังหวะ', format: formatTime },
    { field: 'restBetween', label: 'พักระหว่างจังหวะ', format: formatTime },
    { field: 'bypass', label: 'bypass (น้ำอุณหภูมิห้อง)', format: (v) => `${v} g` },
  ],
};

function Fact({ label, value, note }) {
  return (
    <div>
      <div className="recipe__fact-label">{label}</div>
      <div className="recipe__fact-value">{value}</div>
      {note && <div className="recipe__fact-note">{note}</div>}
    </div>
  );
}

function RangeSlider({ label, format, value, range, bounds, onChange }) {
  const pct = (v) => ((v - bounds.min) / (bounds.max - bounds.min)) * 100;
  const hint =
    range[0] === range[1] ? `แนะนำ ${format(range[0])}` : `แนะนำ ${format(range[0])} ถึง ${format(range[1])}`;
  return (
    <div>
      <div className="recipe__slider-head">
        <span className="recipe__slider-label">{label}</span>
        <span className="recipe__slider-value">{format(value)}</span>
      </div>
      <input
        type="range"
        className="recipe__slider"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        aria-label={label}
        style={{ '--band-start': `${pct(range[0])}%`, '--band-end': `${pct(range[1])}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="recipe__slider-hint">{hint}</div>
    </div>
  );
}

export default function RecipeCard({ recipe, picks, onPick, onStart }) {
  const bounds = rules[recipe.device].sliderBounds;
  const ratioFinal = `1:${recipe.ratioFinal[0].toFixed(1)} ถึง 1:${recipe.ratioFinal[1].toFixed(1)}`;

  return (
    <section className="recipe">
      <div className="recipe__facts">
        <Fact label="กาแฟ" value={`${recipe.dose} g`} />
        <Fact
          label="น้ำ"
          value={`${recipe.water} g`}
          note={`1:${recipe.ratioConcentrate.toFixed(1)} ของน้ำที่เทเข้า`}
        />
        {recipe.yield && (
          <Fact
            label="น้ำกาแฟที่ได้"
            value={`~${recipe.yield} g`}
            note="ต่ำกว่า 150 g คือกดไม่สุด เกิน 185 g คือน้ำเลี่ยงชั้นกาแฟ"
          />
        )}
        <Fact
          label="อุณหภูมิตอนดื่ม"
          value={`${recipe.drinkTemp[0]}-${recipe.drinkTemp[1]} องศา`}
        />
      </div>

      {SLIDERS[recipe.device].map(({ field, label, format }) => (
        <RangeSlider
          key={field}
          label={label}
          format={format}
          value={picks[field]}
          range={recipe[field]}
          bounds={bounds[field]}
          onChange={(v) => onPick(field, v)}
        />
      ))}

      <div className="recipe__statics">
        <span>ratio รวม bypass {ratioFinal} (ของน้ำที่เทเข้า ไม่ใช่ปริมาณน้ำในถ้วย)</span>
        <span>ฟิลเตอร์: {recipe.filter}</span>
        {recipe.bloom && <span>{recipe.bloom}</span>}
        {recipe.strokes && <span>แบ่งกด {recipe.strokes} จังหวะ</span>}
      </div>

      {recipe.notes.length > 0 && (
        <div className="recipe__notes">
          {recipe.notes.map((note) => (
            <span
              key={note}
              className={note === COARSE_NOTE ? 'recipe__note--warning' : undefined}
            >
              {note}
            </span>
          ))}
        </div>
      )}

      <button type="button" className="recipe__start" onClick={onStart}>
        เริ่มชง
      </button>
    </section>
  );
}
```

- [ ] **Step 3: Wire it into `src/App.jsx`**

Add the import:

```jsx
import RecipeCard from './components/RecipeCard.jsx';
```

Replace the summary `<p>` inside the worksheet branch with:

```jsx
            <RecipeCard
              recipe={recipe}
              picks={picks}
              onPick={changePick}
              onStart={() => setView('timer')}
            />
```

- [ ] **Step 4: Verify by eye**

Run: `bun run dev`
Expected, checking each item:
- AeroPress default shows 18 g, 190 g, 1:10.6, sliders at 88 องศา / Mavo 6.0 / 1:45 / 80 g
- Dragging a slider past the highlighted band still works and the band stays put
- Switching to Delter Press swaps the slider list to six entries and shows the `~170 g` yield fact
- Selecting `ปานามา เกอิชา` on AeroPress moves temp to 87 and bypass hint to 100-115
- Selecting `ต่ำ` altitude with `Anaerobic` shows the coarse-grind warning in the warning colour

- [ ] **Step 5: Verify the build**

Run: `bun run test && bun run build`
Expected: both succeed

- [ ] **Step 6: Commit**

```bash
git add src/components/RecipeCard.jsx src/components/RecipeCard.css src/App.jsx
git commit -m "Add RecipeCard with range sliders and recommended-band highlight"
```

---

### Task 9: Grind unit converter

**Files:**
- Create: `src/components/GrindConverter.jsx`, `src/components/GrindConverter.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `toMavo`, `GRINDERS` from Task 4
- Produces: `<GrindConverter />` (holds its own input state, takes no props)

- [ ] **Step 1: Create `src/components/GrindConverter.css`**

```css
.converter {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.converter__title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.converter__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.converter__label {
  flex: 1;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.converter__input {
  width: 84px;
  padding: 10px;
  text-align: center;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-height: 44px;
}

.converter__result {
  width: 88px;
  text-align: right;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.converter__warning {
  font-size: 0.6875rem;
  color: var(--color-warning);
}
```

- [ ] **Step 2: Create `src/components/GrindConverter.jsx`**

```jsx
import { useState } from 'react';
import { GRINDERS, toMavo } from '../data/brew.js';
import './GrindConverter.css';

export default function GrindConverter() {
  const [clicks, setClicks] = useState({ c40: '', c2: '' });

  return (
    <section className="converter">
      <h2 className="converter__title">แปลงหน่วยบดเป็นเลขหน้าปัด Mavo</h2>
      {GRINDERS.map((grinder) => {
        const mavo = toMavo(clicks[grinder.key], grinder.key);
        return (
          <div key={grinder.key}>
            <div className="converter__row">
              <label className="converter__label" htmlFor={`converter-${grinder.key}`}>
                {grinder.label}
              </label>
              <input
                id={`converter-${grinder.key}`}
                className="converter__input"
                type="number"
                inputMode="numeric"
                value={clicks[grinder.key]}
                onChange={(e) => setClicks((prev) => ({ ...prev, [grinder.key]: e.target.value }))}
              />
              <span className="converter__result">{mavo === null ? '' : `Mavo ${mavo.toFixed(1)}`}</span>
            </div>
            {grinder.warning && <p className="converter__warning">{grinder.warning}</p>}
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 3: Wire it into `src/App.jsx`**

Add the import:

```jsx
import GrindConverter from './components/GrindConverter.jsx';
```

Add it after `<RecipeCard ... />` inside the worksheet branch:

```jsx
            <GrindConverter />
```

- [ ] **Step 4: Verify by eye**

Run: `bun run dev`
Expected: typing `22` into the C40 field shows `Mavo 6.0`; typing `19` into the C2 field shows `Mavo 6.0`; clearing a field blanks its result rather than showing `NaN`; the C2 row shows the warning text and the C40 row shows none.

- [ ] **Step 5: Verify the build**

Run: `bun run build`
Expected: succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/GrindConverter.jsx src/components/GrindConverter.css src/App.jsx
git commit -m "Add grinder click to Mavo dial converter"
```

---

### Task 10: Taste-fix table

**Files:**
- Create: `src/components/FixTable.jsx`, `src/components/FixTable.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `rules.fixes` and `rules[device].label` from Task 1
- Produces: `<FixTable device={input.device} />` (read-only, no state, no apply button)

- [ ] **Step 1: Create `src/components/FixTable.css`**

```css
.fix {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fix__caption {
  padding: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-warning);
  background: var(--color-surface);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
}

.fix__intro {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.fix__card {
  padding: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.fix__symptom {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.fix__steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 20px;
  font-size: 0.8125rem;
  color: var(--color-text);
}
```

- [ ] **Step 2: Create `src/components/FixTable.jsx`**

```jsx
import rules from '../data/brewing-rules.js';
import './FixTable.css';

export default function FixTable({ device }) {
  return (
    <section className="fix">
      <p className="fix__caption">
        ข้อที่บอกให้เพิ่มกาแฟ ต้องชั่งเอง แอปล็อกโดสไว้ที่ค่าตั้งต้น ไม่ได้ปรับให้
      </p>
      <p className="fix__intro">
        {rules[device].label} · ทำทีละข้อ ชิมทุกครั้ง หยุดเมื่อดีขึ้น
      </p>
      {rules.fixes[device].map((fix) => (
        <article className="fix__card" key={fix.symptom}>
          <h2 className="fix__symptom">{fix.symptom}</h2>
          <ol className="fix__steps">
            {fix.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Wire it into `src/App.jsx`**

Add the import:

```jsx
import FixTable from './components/FixTable.jsx';
```

Replace the `view === 'fix'` placeholder with:

```jsx
        {view === 'fix' && <FixTable device={input.device} />}
```

- [ ] **Step 4: Verify by eye**

Run: `bun run dev`
Expected: tapping `แก้รส` shows the dose caption, then three cards for AeroPress starting with `ขม ไม่มีกลิ่น แบน`. Going back to `สูตร`, switching the device to Delter Press, then back to `แก้รส` shows six cards starting with `บาง จืด เปรี้ยว ไม่มี body`, and the previously selected inputs are still intact.

- [ ] **Step 5: Verify the build**

Run: `bun run build`
Expected: succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/FixTable.jsx src/components/FixTable.css src/App.jsx
git commit -m "Add read-only taste-fix table"
```

---

### Task 11: Timer, timer steps, and wake lock

**Files:**
- Create: `src/hooks/useWakeLock.js`, `src/components/Timer.jsx`, `src/components/TimerStep.jsx`
- Modify: `src/components/Timer.css`, `src/App.jsx`
- Read but do not modify: `src/hooks/useTimer.js`

**Interfaces:**
- Consumes: `buildTimerSteps` from Task 5, the existing `useTimer(steps, totalTime)` hook, `setView('worksheet')` from Task 6
- Produces: `<Timer recipe={recipe} picks={picks} onBack={() => setView('worksheet')} />` and `<TimerStep step={step} index={i} state={'active' | 'complete' | 'pending'} remaining={seconds | null} />`

`useTimer` already returns `{ elapsedTime, isRunning, isComplete, currentStepIndex, currentStep, stepTimeRemaining, totalTimeRemaining, stepChanged, progress, start, pause, toggle, reset, formatTime }`. It locates the current step from `step.startTime` (absolute cumulative) and never reads `step.duration`, which is exactly what `buildTimerSteps` produces.

- [ ] **Step 1: Create `src/hooks/useWakeLock.js`**

```js
import { useEffect, useRef } from 'react';

// กันจอดับตอนจับเวลา ใช้ navigator.wakeLock ตรงๆ ไม่ต้องมี dependency
// เบราว์เซอร์ปล่อย lock เองเมื่อสลับแท็บ จึงต้องขอใหม่ตอนกลับมา visible
export function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;

    const acquire = async () => {
      if (lockRef.current) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        lock.addEventListener('release', () => {
          lockRef.current = null;
        });
        lockRef.current = lock;
      } catch {
        // ponytail: ไม่รองรับหรือถูกปฏิเสธ ปล่อยเงียบ timer ทำงานต่อปกติ
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
```

- [ ] **Step 2: Create `src/components/TimerStep.jsx`**

```jsx
import './TimerStep.css';

export default function TimerStep({ step, index, state, remaining }) {
  return (
    <div className={`timer-step${state === 'pending' ? '' : ` timer-step--${state}`}`}>
      <span className="timer-step__number">{index + 1}</span>
      <div className="timer-step__content">
        <div className="timer-step__name">{step.name}</div>
        <div className="timer-step__instruction">{step.instruction}</div>
      </div>
      <span className="timer-step__time">{remaining}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/Timer.jsx`**

```jsx
import { useEffect } from 'react';
import { useTimer } from '../hooks/useTimer.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { buildTimerSteps } from '../data/brew.js';
import rules from '../data/brewing-rules.js';
import TimerStep from './TimerStep.jsx';
import './Timer.css';

export default function Timer({ recipe, picks, onBack }) {
  const { steps, totalTime } = buildTimerSteps(recipe, picks);
  const timer = useTimer(steps, totalTime);
  useWakeLock(timer.isRunning);

  // กะพริบพื้นหลังตอนเปลี่ยน step เพื่อให้เห็นจากระยะแขนตอนมือไม่ว่าง
  useEffect(() => {
    if (!timer.stepChanged) return undefined;
    document.body.classList.add('step-change');
    const id = setTimeout(() => document.body.classList.remove('step-change'), 500);
    return () => {
      clearTimeout(id);
      document.body.classList.remove('step-change');
    };
  }, [timer.stepChanged]);

  const stepState = (index) => {
    if (index === timer.currentStepIndex) return 'active';
    if (index < timer.currentStepIndex) return 'complete';
    return 'pending';
  };

  return (
    <div className="timer">
      <div className="timer__header">
        <button type="button" className="timer__back-btn" onClick={onBack}>
          ย้อนกลับ
        </button>
        <span className="timer__device">{rules[recipe.device].label}</span>
      </div>

      <div className="timer__summary">
        <div className="timer__summary-item">
          <span className="timer__summary-value">{recipe.dose} g</span>
          <span className="timer__summary-label">กาแฟ</span>
        </div>
        <div className="timer__summary-item">
          <span className="timer__summary-value">{recipe.water} g</span>
          <span className="timer__summary-label">น้ำ</span>
        </div>
        <div className="timer__summary-item">
          <span className="timer__summary-value">{picks.temp} องศา</span>
          <span className="timer__summary-label">อุณหภูมิ</span>
        </div>
        <div className="timer__summary-item">
          <span className="timer__summary-value">{picks.grind.toFixed(1)}</span>
          <span className="timer__summary-label">Mavo</span>
        </div>
      </div>

      <div className={`timer__display${timer.isComplete ? ' timer__display--complete' : ''}`}>
        <div className="timer__time">{timer.formatTime(timer.totalTimeRemaining)}</div>
        <div className="timer__progress-bar">
          <div className="timer__progress-fill" style={{ width: `${timer.progress}%` }} />
        </div>
        {timer.isComplete && <div className="timer__complete-msg">ชงเสร็จแล้ว</div>}
      </div>

      <div className="timer__steps">
        {steps.map((step, index) => (
          <TimerStep
            key={step.name}
            step={step}
            index={index}
            state={stepState(index)}
            remaining={
              index === timer.currentStepIndex
                ? timer.formatTime(timer.stepTimeRemaining)
                : timer.formatTime(step.duration)
            }
          />
        ))}
      </div>

      <div className="timer__controls">
        <button
          type="button"
          className="timer__control-btn timer__control-btn--secondary"
          onClick={timer.reset}
        >
          ชงซ้ำ
        </button>
        <button
          type="button"
          className={`timer__control-btn timer__control-btn--primary${
            timer.isComplete ? ' timer__control-btn--complete' : ''
          }`}
          onClick={timer.toggle}
          disabled={timer.isComplete}
        >
          {timer.isComplete ? 'เสร็จแล้ว' : timer.isRunning ? 'หยุดชั่วคราว' : 'เริ่ม'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace the v1 method-name styles in `src/components/Timer.css`**

Replace the `.timer__method`, `.timer__method-icon` and `.timer__method-name` blocks with:

```css
.timer__device {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}
```

Then add these two rules to the end of the file, because the four-item summary needs to fit a narrow phone and the completed timer should not look clickable:

```css
.timer__summary {
  flex-wrap: wrap;
  gap: 12px;
}

.timer__control-btn:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
}
```

- [ ] **Step 5: Wire it into `src/App.jsx`**

Add the import:

```jsx
import Timer from './components/Timer.jsx';
```

Replace the `view === 'timer'` placeholder with:

```jsx
        {view === 'timer' && (
          <Timer recipe={recipe} picks={picks} onBack={() => setView('worksheet')} />
        )}
```

- [ ] **Step 6: Verify by eye**

Run: `bun run dev`
Expected:
- AeroPress, tap `เริ่มชง`, tap `เริ่ม`: the countdown starts at `2:50`, the first step is highlighted, the background flashes when it moves to `แช่`
- Tap `หยุดชั่วคราว` and the countdown stops; tap again and it resumes
- Let it run out (or drag the sliders to their minimums first): the display turns green, shows `ชงเสร็จแล้ว`, and the main button is disabled
- Tap `ชงซ้ำ`: the countdown resets to full and nothing auto-navigates
- `ย้อนกลับ` returns to the worksheet with the same inputs and picks
- Switch to Delter Press, tap `เริ่มชง`: seven steps appear, with `จังหวะ 1` and `จังหวะ 2` both saying `ยกถึงขีด 75`

- [ ] **Step 7: Verify the build and tests**

Run: `bun run test && bun run build`
Expected: both succeed

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useWakeLock.js src/components/Timer.jsx src/components/TimerStep.jsx src/components/Timer.css src/App.jsx
git commit -m "Add v2 timer with wake lock and computed steps"
```

---

### Task 12: Final verification and pull request

**Files:**
- Modify: none expected. Fix whatever the checks below turn up.

**Interfaces:**
- Consumes: everything from Tasks 1 to 11
- Produces: a pull request into `main`

- [ ] **Step 1: Confirm no v1 leftovers**

Run: `rg -n "strength|localStorage|coffeecal|brew-history|jirbrewstack-" src/ index.html`
Expected: no matches. Any hit is a leftover that must go.

Run: `rg -n "Timemore" src/`
Expected: exactly one hit, the `Timemore C2` label inside `GRINDERS` in `src/data/brew.js`, which is intentional because it names the grinder in the converter UI.

- [ ] **Step 2: Confirm no emoji and no emdash in the source**

Run: `rg -n "—" src/ index.html`
Expected: no matches

- [ ] **Step 3: Confirm the dependency list is unchanged**

Run: `git diff main -- package.json`
Expected: the only change is the added `"test"` script. No new entry under `dependencies` or `devDependencies`.

- [ ] **Step 4: Run the full check**

Run: `bun run test && bun run build`
Expected: all tests pass and the build succeeds

- [ ] **Step 5: Check it on a real phone once**

Run: `bun run dev --host` and open the network URL on your phone.
Expected: everything fits within the 480px card without sideways scrolling, every tap target is comfortable, and the screen stays awake while the timer runs.

- [ ] **Step 6: Open the pull request**

```bash
git push -u origin feat/v2-worksheet
gh pr create --base main --title "JirBrewStack v2: worksheet calculator" --body "$(cat <<'EOF'
แทนที่โมเดลกาแฟเดิมทั้งหมดด้วยกรอบวิธีชง v2 จาก Notion worksheet 2 หน้า (AeroPress inverted และ Delter Press)

สเปก: docs/superpowers/specs/2026-08-01-jirbrewstack-v2-worksheet-design.md
แผน: docs/superpowers/plans/2026-08-02-jirbrewstack-v2-worksheet.md

หลัก
- ตัวเลขและกฎทั้งหมดอยู่ใน src/data/brewing-rules.js แก้ได้โดยไม่ต้องแตะโค้ด
- src/data/brew.js เป็น pure function ล้วน ทดสอบด้วย node --test ไม่เพิ่ม dependency
- ลบโมเดลเดิมออกราว 2,400 บรรทัด (localStorage, history, dial-in assistant, strength scale, Timemore C2 clicks)
- แอปเป็น stateless ทั้งหมด ไม่มี localStorage ไม่มี router

ทดสอบ
- node --test ผ่านทุกเคส รวมการวนตรวจครบ 432 combo ต่อเครื่อง (864 รวมสองเครื่อง)
- bun run build ผ่าน
- เปิดดูบนมือถือจริงแล้ว

ยังไม่ deploy รอกด workflow_dispatch เอง
EOF
)"
```

- [ ] **Step 7: Report the PR URL**

Print the URL that `gh pr create` returned. Do not post any review comment on the PR.

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| 1 goals and scope, localStorage decision | Task 6 (deletes `useLocalStorage`/`useBrewHistory`, never writes storage) |
| 2 principle 1 devices unsynced | Task 1 (`aeropress` and `delter` are separate literals) |
| 2 principle 2 error directions reversed | Task 1 (`fixes` order per device), Task 10 |
| 2 principle 3 no multi-way extraction cuts | Encoded in the rule tables in Task 1 |
| 2 principle 4 coarse needs more dose | Task 2 (`COARSE_NOTE`), Task 8 (warning colour), Task 10 (caption) |
| 2 principle 5 altitude never touches temp | Task 1 (`altitude` patches have no `temp`), Task 3 test 8 |
| 2 principle 6 dial numbers not clicks | Task 1 and Task 4 |
| 2 principle 7 round to 0.5 | Task 1 `roundHalf`, Task 3 test 9, Task 4 |
| 3 architecture and file plan | Tasks 6 to 11 |
| 4.1 inputs | Task 1 `options` and `defaults`, Task 7 |
| 4.2 combine rules, normalize, field ownership, clamp | Tasks 1 and 2 |
| 4.3, 4.4 value tables | Task 1 |
| 4.5 temperature combo table | Task 3 test 2 |
| 4.6 grind conversion | Task 4 |
| 4.7 taste-fix table | Task 1 `fixes`, Task 10 |
| 5 UI, `m:ss`, navigation, slider bounds, timer contract, wake lock | Tasks 5 to 11 |
| 6 error handling | Task 1 (`normalizeRange` throws), Task 2 (`pick` throws), Task 4 (`toMavo` returns null), Task 11 (wake lock stays silent) |
| 7 tests 1 to 16 | Task 1 (16), Task 2 (1, 4, 5, 6, 7, 12), Task 3 (2, 3, 8, 9, 10, 11, 14), Task 4 (13), Task 5 (15) |
| 10 done criteria | Task 12 |

**Deliberate deviations from the spec, all noted at their task:**
- `normalizeRange` also rejects `min > max`. The spec only asked test 16 to assert it; enforcing it at the single point of entry is cheaper and catches a reversed delta like `[1.0, 0.5]` at load time.
- Task 3 test 2 checks 11 rows rather than the spec's 6, because the spec's table collapses `anaerobic / barrel / cm / yeast` and `washed / honey` into single rows. Expanding them costs nothing and pins more.
- `recipe.notes` carries the coarse warning as its last entry rather than exposing a separate boolean, so the test asserts against the exported `COARSE_NOTE` constant. One field fewer on the recipe object.

**Type consistency check:** `computeRecipe` returns `device` on the recipe, and both `defaultPicks(recipe)` and `buildTimerSteps(recipe, picks)` read `recipe.device` rather than taking a separate argument. `sliderBounds` entries are `{ min, max, step }` objects everywhere (Tasks 1, 3, 8); the range fields on the recipe are `[min, max]` arrays everywhere (Tasks 2, 3, 8). `formatTime` is exported from `brew.js` for instruction strings and separately returned by `useTimer` for display; both produce `m:ss`, and `Timer.jsx` uses the hook's copy.

**Placeholder scan:** Task 3 Step 3 contains one deliberately wrong `defaultPick` expression immediately followed by the correct one. That is the only place in this plan where code is shown that must not be used, and it is labelled inline. Everything else is final code.
