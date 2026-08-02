import './TimerStep.css';

export default function TimerStep({ step, index, state, remaining, onSeek }) {
  return (
    <button
      type="button"
      className={`timer-step${state === 'pending' ? '' : ` timer-step--${state}`}`}
      aria-current={state === 'active' ? 'step' : undefined}
      onClick={onSeek}
    >
      <span className="timer-step__number">{index + 1}</span>
      <span className="timer-step__content">
        <span className="timer-step__name">{step.name}</span>
        <span className="timer-step__instruction">{step.instruction}</span>
      </span>
      <span className="timer-step__time">{remaining}</span>
    </button>
  );
}
