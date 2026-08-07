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
