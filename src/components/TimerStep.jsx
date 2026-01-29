import './TimerStep.css';

export function TimerStep({ step, index, isActive, isComplete, timeRemaining, formatTime, values }) {
  let statusClass = '';
  if (isComplete) {
    statusClass = 'timer-step--complete';
  } else if (isActive) {
    statusClass = 'timer-step--active';
  }

  const instruction = step.getInstruction ? step.getInstruction(values) : step.instruction;
  const amount = step.getAmount ? step.getAmount(values) : null;

  return (
    <div className={`timer-step ${statusClass}`}>
      <div className="timer-step__number">
        {isComplete ? '✓' : index + 1}
      </div>
      <div className="timer-step__content">
        <div className="timer-step__name">{step.name}</div>
        {isActive && (
          <div className="timer-step__instruction">{instruction}</div>
        )}
        {!isActive && !isComplete && amount && (
          <div className="timer-step__preview">
            {amount.water}ml
          </div>
        )}
      </div>
      <div className="timer-step__time">
        {isActive ? formatTime(timeRemaining) : `${step.duration}s`}
      </div>
    </div>
  );
}
