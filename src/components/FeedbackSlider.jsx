import './FeedbackSlider.css';

export function FeedbackSlider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
  centerLabel,
}) {
  const handleChange = (e) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="feedback-slider">
      <div className="feedback-slider__header">
        <span className="feedback-slider__label">{label}</span>
      </div>
      <div className="feedback-slider__dots">
        {[1, 2, 3, 4, 5].map((dotValue) => (
          <button
            key={dotValue}
            type="button"
            className={`feedback-slider__dot ${
              value === dotValue ? 'feedback-slider__dot--active' : ''
            }`}
            onClick={() => onChange(dotValue)}
            aria-label={`${label}: ${dotValue} of 5`}
          />
        ))}
      </div>
      <input
        type="range"
        className="feedback-slider__input sr-only"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={handleChange}
        aria-label={label}
      />
      <div className="feedback-slider__labels">
        <span>{leftLabel}</span>
        <span>{centerLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
