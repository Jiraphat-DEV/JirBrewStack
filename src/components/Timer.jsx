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
