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
