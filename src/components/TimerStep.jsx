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
