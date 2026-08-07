# Timer นับขึ้น กดจบขั้นเอง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยน timer จากนาฬิกาถอยหลังที่เดินเองเป็นนาฬิกานับขึ้นที่รอผู้ใช้กดจบขั้น และเก็บเวลาจริงต่อขั้นเป็นวินาทีไว้ส่งต่อให้ item 06

**Architecture:** state มีสองตัวคือ `actuals` (เวลาจริงของขั้นที่จบแล้ว) กับ `stepStartedAt` (timestamp) ที่เหลือ derive ทั้งหมด ตรรกะอยู่ในฟังก์ชันบริสุทธิ์สองตัว (`timerReducer`, `timerView`) ที่เทสได้ด้วย `node --test` ส่วน `useTimer` เหลือแค่ glue ของ React ที่ห่อ `useReducer` กับ `setInterval` เวลาคำนวณจาก `Date.now()` เสมอ ไม่ใช่จากการบวกเลขทุกครั้งที่ interval ยิง

**Tech Stack:** React 18 + Vite, `node --test` (node 22) ไม่เพิ่ม dependency ใดๆ

**Spec:** [2026-08-07-timer-count-up-design.md](../specs/2026-08-07-timer-count-up-design.md) · [req 01](../specs/2026-08-05-jirbrewstack-v2.1-req/01-timer-count-up.md)

## Global Constraints

- ไม่เพิ่ม dependency ใดๆ ทั้งใน `dependencies` และ `devDependencies` (โปรเจกต์มีแค่ `react`, `react-dom`, `vite`, `@vitejs/plugin-react`)
- ห้ามแตะ `src/data/brew.js`, `src/data/brewing-rules.js`, `src/data/brew.test.js`, `src/App.jsx`, `src/hooks/useWakeLock.js`
- `buildTimerSteps(recipe, picks)` ยังคืน `{ steps, totalTime }` เหมือนเดิม timer ใช้แค่ `steps` และอ่าน `step.duration` เป็นเป้าหมายของขั้น (`step.startTime` กับ `totalTime` เลิกใช้)
- `bun run test` ต้องผ่านทุกครั้งที่ commit และ `brew.test.js` ต้องไม่พัง ถ้าพังแปลว่าไปแตะสิ่งที่ไม่ควรแตะ
- ไม่มีเสียง ไม่มีการสั่น ไม่มีการเตือนอัตโนมัติเมื่อเกินเป้า ไม่มีปุ่มหยุดชั่วคราว ไม่มีจุดที่นาฬิกาหยุดเอง
- ปัดเศษวินาทีใช้ `Math.floor` ทั้งการแสดงผลและการบันทึก เลขที่จดต้องเท่ากับเลขที่เห็นบนจอตอนกดเสมอ
- ข้อความบน UI เป็นภาษาไทย ห้ามใช้ emoji และห้ามใช้ emdash
- ใช้ CSS custom property ที่มีอยู่แล้วใน `src/index.css` เท่านั้น (`--fs-*`, `--s-*`, `--color-*`, `--radius-*`, `--tap`, `--transition-*`, `--shadow-*`) ห้ามใส่ค่าสีดิบใหม่
- สีของส่วนต่าง: เป็นบวก (เกินเป้า) ใช้ `--color-warning-text` เป็นลบใช้ `--color-text-muted` ห้ามใช้สีเขียว

---

### Task 1: โมเดลเวลาบริสุทธิ์ + เทส

เขียน `src/hooks/useTimer.js` ใหม่ทั้งไฟล์ เริ่มจากเฉพาะส่วนที่เป็นฟังก์ชันบริสุทธิ์ (ยังไม่ใส่ React hook) จบ task นี้แล้ว `bun run test` ต้องผ่านโดยมีเทสใหม่ 7 เคส ตัวแอปยังพังอยู่เพราะ `Timer.jsx` ยังเรียก API เดิม อันนั้นเป็นงานของ Task 2

**Files:**
- Modify: `src/hooks/useTimer.js` (เขียนทับทั้งไฟล์ ของเดิม 114 บรรทัดทิ้งทั้งหมด)
- Create: `src/hooks/useTimer.test.js`
- Modify: `package.json:8` (script `test`)

**Interfaces:**
- Consumes: `step.duration` (number, วินาที) จาก object ที่ `buildTimerSteps()` คืนใน `src/data/brew.js:293`
- Produces:
  - `initialTimerState: { actuals: number[], stepStartedAt: number | null }`
  - `timerReducer(state, action) -> state` โดย action เป็น `{ type: 'goToStep', index: number, now: number }` หรือ `{ type: 'endStep', now: number, stepCount: number }` หรือ `{ type: 'reset' }`
  - `timerView(steps, state, now) -> { currentStepIndex, isComplete, isRunning, stepElapsed, stepTarget, stepDiff, totalElapsed, progress }`
  - `formatTime(seconds: number) -> string` เช่น `"2:47"`
  - `formatDiff(seconds: number) -> string | null` เช่น `"+12 วิ"`, `"-5 วิ"`, `null` เมื่อเป็น 0

- [ ] **Step 1: เขียนเทสที่ยังพัง**

สร้าง `src/hooks/useTimer.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialTimerState,
  timerReducer,
  timerView,
  formatTime,
  formatDiff,
} from './useTimer.js';

// เป้าหมายของแต่ละขั้นเป็นวินาที เลียนแบบสิ่งที่ buildTimerSteps() คืน
const STEPS = [
  { name: 'bloom', duration: 30 },
  { name: 'เทรอบแรก', duration: 40 },
  { name: 'รอ', duration: 60 },
];

const T0 = 1_754_500_000_000; // timestamp คงที่ ไม่พึ่ง Date.now() ในเทส

const start = (now = T0) => timerReducer(initialTimerState, { type: 'goToStep', index: 0, now });
const end = (state, now) => timerReducer(state, { type: 'endStep', now, stepCount: STEPS.length });

test('กดเริ่มแล้วปล่อยทิ้ง 5 นาที ยังอยู่ขั้นแรกและไม่มีอะไรประกาศว่าเสร็จ', () => {
  const state = start();
  const view = timerView(STEPS, state, T0 + 300_000);

  assert.equal(view.currentStepIndex, 0);
  assert.equal(view.isComplete, false);
  assert.equal(view.isRunning, true);
  assert.equal(view.stepElapsed, 300);
  assert.equal(view.totalElapsed, 300);
});

test('จบขั้นช้ากว่าเป้า 20 วิ ได้ +20 และบันทึกเวลาจริงไม่ใช่เป้า', () => {
  const state = start();

  // ขั้นแรกเป้า 30 วิ กดจบตอน 50 วิ
  assert.equal(timerView(STEPS, state, T0 + 50_000).stepDiff, 20);

  const after = end(state, T0 + 50_000);
  assert.deepEqual(after.actuals, [50]);
});

test('ย้อนขั้นแล้วเวลาถูกนับใหม่ ไม่บวกทับของเดิม', () => {
  // จบขั้น 1 ที่ 35 วิ จบขั้น 2 ที่ 80 วิ (ใช้ไป 45) แล้วเดินอยู่ในขั้น 3 ได้ 15 วิ
  let state = start();
  state = end(state, T0 + 35_000);
  state = end(state, T0 + 80_000);
  assert.deepEqual(state.actuals, [35, 45]);
  assert.equal(timerView(STEPS, state, T0 + 95_000).totalElapsed, 95);

  // กดขั้นที่ 2 ในลิสต์เพื่อย้อนกลับ 45 ของขั้น 2 กับ 15 ที่เดินไปในขั้น 3 ต้องหายไป
  state = timerReducer(state, { type: 'goToStep', index: 1, now: T0 + 95_000 });
  assert.deepEqual(state.actuals, [35]);
  assert.equal(timerView(STEPS, state, T0 + 95_000).totalElapsed, 35);

  // เทขั้น 2 ใหม่ ใช้ 50 วิ
  state = end(state, T0 + 145_000);
  assert.deepEqual(state.actuals, [35, 50]);
  assert.equal(timerView(STEPS, state, T0 + 145_000).totalElapsed, 85);
});

test('จบครบทุกขั้นแล้วได้เวลาจริงครบ นาฬิกาหยุดเดิน', () => {
  let state = start();
  state = end(state, T0 + 35_000);
  state = end(state, T0 + 80_000);
  state = end(state, T0 + 150_000);

  assert.equal(state.actuals.length, STEPS.length);
  assert.deepEqual(state.actuals, [35, 45, 70]);
  assert.equal(state.stepStartedAt, null);

  const view = timerView(STEPS, state, T0 + 999_000);
  assert.equal(view.isComplete, true);
  assert.equal(view.isRunning, false);
  assert.equal(view.totalElapsed, 150);
  assert.equal(view.progress, 100);
});

test('กดจบขั้นตอนยังไม่เริ่ม ไม่ทำอะไรเลย', () => {
  const state = end(initialTimerState, T0);
  assert.equal(state, initialTimerState);
});

test('reset กลับไปสถานะตั้งต้น', () => {
  let state = start();
  state = end(state, T0 + 35_000);
  assert.deepEqual(timerReducer(state, { type: 'reset' }), initialTimerState);
});

test('formatTime กับ formatDiff', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(9), '0:09');
  assert.equal(formatTime(167), '2:47');

  assert.equal(formatDiff(12), '+12 วิ');
  assert.equal(formatDiff(-5), '-5 วิ');
  assert.equal(formatDiff(0), null);
});
```

- [ ] **Step 2: เปลี่ยน test script ให้ node หาไฟล์เทสเอง**

แก้ `package.json` บรรทัด `"test"` จาก `"node --test src/data/brew.test.js"` เป็น

```json
    "test": "node --test"
```

node 22 หาไฟล์ `**/*.test.js` เองทั้งโปรเจกต์ (ข้าม `node_modules` ให้อยู่แล้ว) จะได้ไม่ต้องมาต่อชื่อไฟล์ทุกครั้งที่มีเทสใหม่

- [ ] **Step 3: รันเทสให้เห็นว่าพัง**

Run: `bun run test`
Expected: FAIL ที่ `useTimer.test.js` ด้วย `SyntaxError` แนวว่า `The requested module './useTimer.js' does not provide an export named 'initialTimerState'` ส่วน `brew.test.js` ต้องยังผ่าน

- [ ] **Step 4: เขียนทับ `src/hooks/useTimer.js` ด้วยส่วนที่เป็นฟังก์ชันบริสุทธิ์**

ลบเนื้อไฟล์เดิมทิ้งทั้งหมด (ทั้ง `useTimer` เดิม, `seek`, `stepChanged`, การนับถอยหลัง) แล้วใส่

```js
export const initialTimerState = { actuals: [], stepStartedAt: null };

// now กับ stepCount ส่งเข้ามาทาง action ไม่ให้ตัว reducer เรียก Date.now() หรืออ่าน steps เอง
// จะได้เทสด้วย node --test ตรงๆ โดยไม่ต้องมี testing library
export function timerReducer(state, action) {
  switch (action.type) {
    // ใช้ตัวเดียวกันทั้งตอนกดเริ่ม (index 0) และตอนย้อนขั้น
    // ย้อนไปขั้น i คือการทิ้งบันทึกตั้งแต่ขั้น i เป็นต้นไป
    case 'goToStep':
      return {
        actuals: state.actuals.slice(0, action.index),
        stepStartedAt: action.now,
      };

    case 'endStep': {
      if (state.stepStartedAt === null) return state;
      const elapsed = Math.max(0, Math.floor((action.now - state.stepStartedAt) / 1000));
      const actuals = [...state.actuals, elapsed];
      return {
        actuals,
        // ขั้นสุดท้ายจบแล้วก็ไม่มีอะไรให้นับต่อ นาฬิกาหยุด
        stepStartedAt: actuals.length >= action.stepCount ? null : action.now,
      };
    }

    case 'reset':
      return initialTimerState;

    default:
      return state;
  }
}

// ค่าที่ UI ใช้ทั้งหมด derive จาก state สองตัว ไม่มี state ซ้ำซ้อน
// actuals.length เป็น source of truth ตัวเดียวว่าอยู่ขั้นไหน index กับบันทึกจึงไม่มีทางไม่ตรงกัน
export function timerView(steps, state, now) {
  const currentStepIndex = state.actuals.length;
  const isComplete = currentStepIndex >= steps.length;
  const isRunning = state.stepStartedAt !== null;
  const stepElapsed = isRunning
    ? Math.max(0, Math.floor((now - state.stepStartedAt) / 1000))
    : 0;
  const stepTarget = isComplete ? 0 : steps[currentStepIndex].duration;
  const recorded = state.actuals.reduce((sum, seconds) => sum + seconds, 0);

  return {
    currentStepIndex,
    isComplete,
    isRunning,
    stepElapsed,
    stepTarget,
    stepDiff: stepElapsed - stepTarget,
    // เวลารวมคือผลรวมของบันทึกที่ถืออยู่ ย้อนขั้นแล้วถอยตาม ไม่ใช่นาฬิกาบนผนัง
    totalElapsed: recorded + stepElapsed,
    // วัดจากจำนวนขั้นที่ผ่าน เพราะไม่มีเวลารวมที่แน่นอนให้วัดอีกแล้ว
    progress: (currentStepIndex / steps.length) * 100,
  };
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// คืน null ตอนตรงเป้าพอดี ให้ component ไม่ต้องเรนเดอร์อะไร
export function formatDiff(seconds) {
  if (seconds === 0) return null;
  return `${seconds > 0 ? '+' : ''}${seconds} วิ`;
}
```

- [ ] **Step 5: รันเทสให้ผ่าน**

Run: `bun run test`
Expected: PASS ทั้งหมด เทสใหม่ 7 เคสใน `useTimer.test.js` และเทสเดิมทั้งหมดใน `brew.test.js`

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTimer.js src/hooks/useTimer.test.js package.json
git commit -m "Rebuild the timer model around recorded per-step time"
```

---

### Task 2: ต่อ hook เข้ากับหน้า Timer

ใส่ `useTimer` hook กลับเข้าไปในไฟล์เดิม แล้วรื้อ `Timer.jsx` กับ `TimerStep.jsx` ให้ใช้ API ใหม่ จบ task นี้แล้วแอปต้องใช้งานได้จริงในเบราว์เซอร์ หน้าตายังไม่สวยเพราะ CSS เป็นงานของ Task 3

**Files:**
- Modify: `src/hooks/useTimer.js` (เติม `useTimer` ต่อท้าย ไม่แตะฟังก์ชันบริสุทธิ์ที่ Task 1 เขียนไว้)
- Modify: `src/components/Timer.jsx` (เขียนทับทั้งไฟล์)
- Modify: `src/components/TimerStep.jsx` (เขียนทับทั้งไฟล์)

**Interfaces:**
- Consumes: `initialTimerState`, `timerReducer`, `timerView`, `formatTime`, `formatDiff` จาก Task 1 · `useWakeLock(active: boolean)` จาก `src/hooks/useWakeLock.js` · `buildTimerSteps(recipe, picks) -> { steps, totalTime }` จาก `src/data/brew.js`
- Produces:
  - `useTimer(steps) -> { currentStepIndex, isComplete, isRunning, stepElapsed, stepTarget, stepDiff, totalElapsed, progress, actuals, goToStep(index), endStep(), reset() }`
  - `TimerStep` props: `{ step, index, state: 'active' | 'complete' | 'pending', time: string, diff: number | null, onSelect: () => void }`
  - class ที่ Task 3 ต้องเขียน CSS ให้: `.timer__clock`, `.timer__diff`, `.timer__diff--over`, `.timer__diff--under`, `.timer__target`, `.timer__total`, `.timer-step__diff`, `.timer-step__diff--over`, `.timer-step__diff--under`

- [ ] **Step 1: เติม `useTimer` ต่อท้าย `src/hooks/useTimer.js`**

เพิ่ม import ไว้บนสุดของไฟล์

```js
import { useEffect, useReducer, useState } from 'react';
```

แล้วต่อท้ายไฟล์

```js
export function useTimer(steps) {
  const [state, dispatch] = useReducer(timerReducer, initialTimerState);
  const [now, setNow] = useState(() => Date.now());

  // interval มีหน้าที่แค่สั่ง re-render ตัวเลขวินาทีคำนวณจาก timestamp เสมอ
  // ของเดิมบวก 1 ทุกครั้งที่ interval ยิง ซึ่งพอแท็บถูกซ่อนเบราว์เซอร์หรี่ interval
  // เหลือนาทีละครั้ง เวลาที่บันทึกเลยน้อยกว่าจริงแบบเงียบๆ
  // 500 ms เพื่อให้เลขบนจอตามหลังของจริงไม่เกินครึ่งวินาที
  useEffect(() => {
    if (state.stepStartedAt === null) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [state.stepStartedAt]);

  // ยิง Date.now() ครั้งเดียวต่อการกด แล้วใช้ค่าเดียวกันทั้งใน action และใน now ที่ใช้ render
  // ถ้าปล่อยให้ now ค้างเก่ากว่า stepStartedAt เวลาที่แสดงจะติดลบชั่วขณะ
  const at = (action) => {
    const t = Date.now();
    setNow(t);
    dispatch({ ...action, now: t });
  };

  return {
    ...timerView(steps, state, now),
    actuals: state.actuals,
    goToStep: (index) => at({ type: 'goToStep', index }),
    endStep: () => at({ type: 'endStep', stepCount: steps.length }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
```

- [ ] **Step 2: รันเทสให้แน่ใจว่า Task 1 ไม่พัง**

Run: `bun run test`
Expected: PASS ทั้งหมดเหมือนเดิม (การ import react เข้ามาในไฟล์ไม่กระทบ node --test ยืนยันแล้วว่า node 22 อ่าน named export ของ react 18 ได้)

- [ ] **Step 3: เขียนทับ `src/components/TimerStep.jsx`**

```jsx
import { formatDiff } from '../hooks/useTimer.js';
import './TimerStep.css';

export default function TimerStep({ step, index, state, time, diff, onSelect }) {
  // กดได้เฉพาะขั้นที่ผ่านมาแล้ว เพื่อย้อนกลับไปทำใหม่
  // ขั้นปัจจุบันกดไม่ได้ กันกดพลาดแล้วเวลาที่เดินอยู่หาย ขั้นข้างหน้ายังไม่ถึงคิว
  const canSelect = state === 'complete';
  const diffLabel = diff === null ? null : formatDiff(diff);

  return (
    <button
      type="button"
      className={`timer-step${state === 'pending' ? '' : ` timer-step--${state}`}`}
      aria-current={state === 'active' ? 'step' : undefined}
      onClick={canSelect ? onSelect : undefined}
      disabled={!canSelect}
    >
      <span className="timer-step__number">{index + 1}</span>
      <span className="timer-step__content">
        <span className="timer-step__name">{step.name}</span>
        <span className="timer-step__instruction">{step.instruction}</span>
      </span>
      <span className="timer-step__time">
        {time}
        {diffLabel && (
          <span className={`timer-step__diff timer-step__diff--${diff > 0 ? 'over' : 'under'}`}>
            {diffLabel}
          </span>
        )}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: เขียนทับ `src/components/Timer.jsx`**

```jsx
import { useTimer, formatTime, formatDiff } from '../hooks/useTimer.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { buildTimerSteps } from '../data/brew.js';
import rules from '../data/brewing-rules.js';
import TimerStep from './TimerStep.jsx';
import './Timer.css';

export default function Timer({ recipe, picks, onBack }) {
  const { steps } = buildTimerSteps(recipe, picks);
  const timer = useTimer(steps);
  useWakeLock(timer.isRunning);

  const diffLabel = formatDiff(timer.stepDiff);

  const stepState = (index) => {
    if (index === timer.currentStepIndex) return 'active';
    if (index < timer.currentStepIndex) return 'complete';
    return 'pending';
  };

  // ขั้นที่ผ่านแล้วโชว์เวลาจริง ขั้นที่กำลังทำโชว์เวลาเดินสด ที่เหลือโชว์เป้าจากสูตร
  const stepTime = (index) => {
    if (index < timer.currentStepIndex) return formatTime(timer.actuals[index]);
    if (index === timer.currentStepIndex && timer.isRunning) return formatTime(timer.stepElapsed);
    return formatTime(steps[index].duration);
  };

  const stepDiffOf = (index) =>
    index < timer.currentStepIndex ? timer.actuals[index] - steps[index].duration : null;

  const mainLabel = timer.isComplete ? 'ชงเสร็จแล้ว' : timer.isRunning ? 'จบขั้นนี้' : 'เริ่ม';

  return (
    <div className="timer">
      <div className="timer__header">
        <button type="button" className="timer__back-btn" onClick={onBack}>
          <span className="timer__back-icon" aria-hidden="true">‹</span>
          ย้อนกลับ
        </button>
        <span className="timer__device">{rules[recipe.device].label}</span>
      </div>

      <div className="timer__summary stats">
        <div className="stat">
          <span className="stat__value">{recipe.dose} g</span>
          <span className="stat__label">กาแฟ</span>
        </div>
        <div className="stat">
          <span className="stat__value">{recipe.water} g</span>
          <span className="stat__label">น้ำ</span>
        </div>
        <div className="stat">
          <span className="stat__value">{picks.temp} องศา</span>
          <span className="stat__label">อุณหภูมิ</span>
        </div>
        <div className="stat">
          <span className="stat__value">{picks.grind.toFixed(1)}</span>
          <span className="stat__label">Mavo</span>
        </div>
      </div>

      <div className={`timer__display${timer.isComplete ? ' timer__display--complete' : ''}`}>
        {/* รวมสถานะขั้นตอนปัจจุบันไว้ในกล่องเดียวกับเวลา จะได้อ่านสถานะทั้งหมดได้จากจุดเดียวตอนมือไม่ว่าง */}
        <div className="timer__step-indicator">
          {timer.isComplete
            ? 'ชงเสร็จแล้ว'
            : `ขั้นที่ ${timer.currentStepIndex + 1}/${steps.length} · ${steps[timer.currentStepIndex].name}`}
        </div>

        {timer.isComplete ? (
          <>
            <div className="timer__clock">
              <span className="timer__time">{formatTime(timer.totalElapsed)}</span>
            </div>
            <div className="timer__target">เวลารวมทั้งหมด</div>
          </>
        ) : (
          <>
            {/* เวลาในขั้นกับส่วนต่างเป็นคู่ที่ต้องอ่านพร้อมกัน เป้าเป็นตัวอ้างอิงรองลงมา */}
            <div className="timer__clock">
              <span className="timer__time">{formatTime(timer.stepElapsed)}</span>
              {timer.isRunning && diffLabel && (
                <span className={`timer__diff timer__diff--${timer.stepDiff > 0 ? 'over' : 'under'}`}>
                  {diffLabel}
                </span>
              )}
            </div>
            <div className="timer__target">เป้า {formatTime(timer.stepTarget)}</div>
            <div className="timer__total">รวม {formatTime(timer.totalElapsed)}</div>
          </>
        )}

        <div className="timer__progress-bar">
          <div className="timer__progress-fill" style={{ width: `${timer.progress}%` }} />
        </div>
      </div>

      <div className="timer__steps">
        {steps.map((step, index) => (
          <TimerStep
            key={step.name}
            step={step}
            index={index}
            state={stepState(index)}
            time={stepTime(index)}
            diff={stepDiffOf(index)}
            onSelect={() => timer.goToStep(index)}
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
          onClick={timer.isRunning ? timer.endStep : () => timer.goToStep(0)}
          disabled={timer.isComplete}
        >
          {mainLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: ตรวจในเบราว์เซอร์ว่าเดินได้จริง**

Run: `bun run dev` แล้วเปิด URL ที่ขึ้นมา เลือกเครื่องกับตัวแปรจนได้การ์ดสูตร กด "เริ่มชง" เข้าหน้า timer

ต้องเห็น: ปุ่มหลักเขียนว่า "เริ่ม" นาฬิกาแสดง 0:00 กดแล้วเลขเดินขึ้น ปุ่มเปลี่ยนเป็น "จบขั้นนี้" กดจบขั้นแล้วขึ้นขั้นถัดไปพร้อมนาฬิกาในขั้นเริ่มนับใหม่ที่ 0 ช่อง "รวม" ไม่รีเซ็ต กดขั้นที่ผ่านมาแล้วในลิสต์แล้วย้อนกลับได้ ขั้นข้างหน้ากดไม่ติด จบครบทุกขั้นแล้วปุ่มเป็น "ชงเสร็จแล้ว" กดไม่ได้ ไม่มี error ใน console

- [ ] **Step 6: รันเทสแล้ว commit**

Run: `bun run test`
Expected: PASS ทั้งหมด

```bash
git add src/hooks/useTimer.js src/components/Timer.jsx src/components/TimerStep.jsx
git commit -m "Drive the timer screen from the count-up model"
```

---

### Task 3: หน้าตาและการอ่านออกจากระยะแขน

จัด layout กล่องนาฬิกาตามที่สเปกวางไว้ ทำป้ายส่วนต่างให้เด่นพอ แล้วลบเอฟเฟกต์กะพริบพื้นหลังตอนเปลี่ยนขั้นทิ้งพร้อมตัวแปรสีที่ไม่มีใครใช้แล้ว

**Files:**
- Modify: `src/components/Timer.css` (เพิ่ม `.timer__clock`, `.timer__diff*`, `.timer__target`, `.timer__total` · ลบ `@keyframes flash` กับ `body.step-change` ที่บรรทัด 177-184)
- Modify: `src/components/TimerStep.css` (เพิ่ม `.timer-step__diff*` และกฎของปุ่มที่กดไม่ได้)
- Modify: `src/index.css:25` (ลบ `--color-warning-flash`)

**Interfaces:**
- Consumes: class ทั้งหมดจาก Task 2 · design token ใน `src/index.css`
- Produces: ไม่มีอะไรที่ task อื่นต้องใช้ต่อ

- [ ] **Step 1: เพิ่มกฎใหม่ใน `src/components/Timer.css`**

แทรกต่อจากบล็อก `.timer__time` (จบที่บรรทัด 84 ของไฟล์เดิม) และก่อน `.timer__progress-bar`

```css
/* เวลาในขั้นกับส่วนต่างต้องอ่านพร้อมกันในสายตาเดียว จึงวางคู่กันบนบรรทัดเดียว
   baseline align เพื่อให้ป้ายส่วนต่างนั่งเสมอฐานตัวเลขไม่ใช่ลอยกลาง */
.timer__clock {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--s-3);
  flex-wrap: wrap;
}

/* req ข้อ 8 ตัวบอกว่าเกินเป้าต้องอ่านออกจากระยะแขนตอนมือเปียก จึงใหญ่ระดับเดียวกับตัวเลขเวลา */
.timer__diff {
  font-size: var(--fs-xl);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.timer__diff--over {
  color: var(--color-warning-text);
}

/* ค่าติดลบระหว่างที่ยังทำขั้นอยู่แค่แปลว่ายังไม่ถึงเป้า ไม่ได้แปลว่าดี จึงเป็นสีกลางไม่ใช่เขียว */
.timer__diff--under {
  color: var(--color-text-muted);
}

.timer__target {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  margin-top: var(--s-2);
}

.timer__total {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  margin-top: var(--s-3);
}

.timer__display--complete .timer__target {
  color: rgba(255, 255, 255, 0.85);
}
```

- [ ] **Step 2: ลบเอฟเฟกต์กะพริบใน `src/components/Timer.css`**

ลบทั้งบล็อกท้ายไฟล์ (บรรทัด 177-184 ของไฟล์เดิม)

```css
@keyframes flash {
  0%, 100% { background-color: var(--color-bg); }
  50% { background-color: var(--color-warning-flash); }
}

body.step-change {
  animation: flash 0.5s ease;
}
```

- [ ] **Step 3: ลบตัวแปรสีที่ไม่มีใครใช้แล้วใน `src/index.css`**

ลบบรรทัด 25

```css
  --color-warning-flash: #E8C79C;
```

- [ ] **Step 4: ยืนยันว่าไม่มีอะไรอ้างถึงของที่ลบไปแล้ว**

Run: `rg -n "step-change|warning-flash|stepChanged|onSeek|stepTimeRemaining|totalTimeRemaining|buildTimerSteps\(.*\)\.totalTime" src/`
Expected: ไม่มีผลลัพธ์เลย

- [ ] **Step 5: เพิ่มกฎใหม่ใน `src/components/TimerStep.css`**

ต่อท้ายไฟล์

```css
/* ขั้นที่กดย้อนกลับไม่ได้ยังต้องดูปกติ แค่ไม่ตอบสนองการกด opacity คุมโดย state class ด้านบนแล้ว */
.timer-step:disabled {
  cursor: default;
}

.timer-step:disabled:active {
  transform: none;
}

/* ส่วนต่างของขั้นที่จบแล้ว วางใต้เวลาจริงในคอลัมน์ขวา */
.timer-step__diff {
  display: block;
  font-size: var(--fs-xs);
  font-weight: 700;
  text-align: right;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.timer-step__diff--over {
  color: var(--color-warning-text);
}

.timer-step__diff--under {
  color: var(--color-text-muted);
}
```

- [ ] **Step 6: ตรวจด้วยมือตามหัวข้อ "วัดผลยังไง" ของ req**

Run: `bun run dev` แล้วเปิดบนมือถือหรือ responsive mode ของ DevTools

ตรวจให้ครบ

1. เข้าหน้า timer กด "เริ่ม" แล้วปล่อยทิ้ง 5 นาทีโดยไม่กดอะไร ยังอยู่ขั้นที่ 1 นาฬิกาขึ้นถึง 5:00 ไม่มีอะไรประกาศว่าเสร็จ (ถ้าไม่อยากรอจริง ให้สลับไปแท็บอื่น 5 นาทีแล้วกลับมา เลขต้องเป็น 5:00 ไม่ใช่เลขที่น้อยกว่านั้น ข้อนี้คือจุดที่พิสูจน์ว่าใช้ timestamp ไม่ใช่การบวกทีละวินาที)
2. กดจบขั้นช้ากว่าเป้าราว 20 วินาที ต้องเห็น `+20 วิ` เป็นตัวใหญ่สีน้ำตาลอ่านออกจากระยะแขน และในลิสต์ step ขั้นนั้นแสดงเวลาจริงไม่ใช่เป้า
3. กดขั้นที่ผ่านมาแล้วในลิสต์เพื่อย้อนกลับ เวลาจริงของขั้นนั้นถูกล้างและนับใหม่ ช่อง "รวม" ถอยตาม ไม่ใช่บวกทับของเดิม
4. จบครบทุกขั้น กล่องเป็นสถานะเสร็จ แสดงเวลารวม และลิสต์ step มีเวลาจริงครบทุกขั้นเท่ากับจำนวน step
5. จอไม่ดับตลอดการชง (ต้องทดสอบบนมือถือจริง `useWakeLock` ผูกกับ `timer.isRunning` ซึ่งเป็น true ตั้งแต่กดเริ่มจนกดจบขั้นสุดท้าย)
6. ทั้งหน้าไม่มี layout ล้นขอบบนจอกว้าง 360px

- [ ] **Step 7: รันเทสแล้ว commit**

Run: `bun run test`
Expected: PASS ทั้งหมด

```bash
git add src/components/Timer.css src/components/TimerStep.css src/index.css
git commit -m "Make the over-target readout legible at arm's length"
```

---

## หลัง 3 task จบ

`actuals` ยังค้างอยู่ใน hook ไม่ได้ต่อ prop ขึ้น `App.jsx` ตั้งใจไว้แบบนั้น item 06 (brew-log-form) เป็นคนตัดสินว่าจะส่งผ่าน state ใน `App.jsx` หรือ prop ตรง

ใช้ superpowers:finishing-a-development-branch เพื่อ merge `feat/timer-count-up` กลับเข้า `feat/v2-worksheet`
