import { useEffect } from 'react';
import { TimerStep } from './TimerStep';
import { useTimer } from '../hooks/useTimer';
import { recipes, getAdjustedTemperature } from '../data/recipes';
import './Timer.css';

export function Timer({ method, values, strength, roastLevel, onBack, onRateBrew }) {
  const recipe = recipes[method];
  const baseTemp = recipe.temperatures[strength];
  const temp = getAdjustedTemperature(baseTemp, roastLevel);
  const {
    isRunning,
    isComplete,
    currentStepIndex,
    stepTimeRemaining,
    totalTimeRemaining,
    stepChanged,
    progress,
    toggle,
    reset,
    formatTime,
  } = useTimer(recipe.steps, recipe.totalTime);

  useEffect(() => {
    if (stepChanged && isRunning) {
      document.body.classList.add('step-change');
      setTimeout(() => {
        document.body.classList.remove('step-change');
      }, 500);
    }
  }, [stepChanged, isRunning]);

  const handleReset = () => {
    reset();
  };

  const handleBack = () => {
    reset();
    onBack();
  };

  return (
    <div className="timer">
      <div className="timer__header">
        <button className="timer__back-btn" onClick={handleBack}>
          ← Back
        </button>
        <div className="timer__method">
          <span className="timer__method-icon">{recipe.icon}</span>
          <span className="timer__method-name">{recipe.name} {recipe.subtitle}</span>
        </div>
      </div>

      <div className="timer__summary">
        <div className="timer__summary-item">
          <span className="timer__summary-value">{values.coffee}g</span>
          <span className="timer__summary-label">Coffee</span>
        </div>
        <div className="timer__summary-item">
          <span className="timer__summary-value">{values.water}ml</span>
          <span className="timer__summary-label">Water</span>
        </div>
        <div className="timer__summary-item">
          <span className="timer__summary-value">{temp.min}-{temp.max}°C</span>
          <span className="timer__summary-label">Temp</span>
        </div>
      </div>

      <div className={`timer__display ${isComplete ? 'timer__display--complete' : ''}`}>
        <div className="timer__time">{formatTime(totalTimeRemaining)}</div>
        <div className="timer__progress-bar">
          <div
            className="timer__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isComplete && <div className="timer__complete-msg">Brew Complete!</div>}
      </div>

      <div className="timer__steps">
        {recipe.steps.map((step, index) => (
          <TimerStep
            key={index}
            step={step}
            index={index}
            isActive={index === currentStepIndex}
            isComplete={index < currentStepIndex || isComplete}
            timeRemaining={stepTimeRemaining}
            formatTime={formatTime}
            values={values}
          />
        ))}
      </div>

      <div className="timer__controls">
        {isComplete ? (
          <>
            <button
              className="timer__control-btn timer__control-btn--secondary"
              onClick={handleBack}
            >
              New Brew
            </button>
            <button
              className="timer__control-btn timer__control-btn--primary timer__control-btn--complete"
              onClick={onRateBrew}
            >
              Rate This Brew
            </button>
          </>
        ) : (
          <>
            <button
              className="timer__control-btn timer__control-btn--secondary"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              className="timer__control-btn timer__control-btn--primary"
              onClick={toggle}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
