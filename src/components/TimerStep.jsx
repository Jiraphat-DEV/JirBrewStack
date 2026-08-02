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
