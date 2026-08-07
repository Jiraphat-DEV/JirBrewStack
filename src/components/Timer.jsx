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
            {/* ป้ายนี้ต้องอยู่ตลอดตอนนาฬิกาเดิน (แม้ diffLabel เป็น null ตอนตรงเป้าพอดี)
                ไม่งั้น .timer__clock ที่ justify-content: center จะบีบตัวเลขเวลากลับไปกลางจอ
                แล้วเด้งออกอีกทีตอนวินาทีถัดไปที่ diff กลับมาไม่เป็น 0 */}
            <div className="timer__clock">
              <span className="timer__time">{formatTime(timer.stepElapsed)}</span>
              {timer.isRunning && (
                <span className={`timer__diff timer__diff--${timer.stepDiff > 0 ? 'over' : 'under'}`}>
                  {diffLabel ?? 'ตรงเป้า'}
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
