import { STRENGTH_LEVELS, strengthLabels } from '../data/recipes';
import './StrengthSlider.css';

export function StrengthSlider({ strength, onStrengthChange }) {
  const handleChange = (e) => {
    onStrengthChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="strength-slider">
      <div className="strength-slider__header">
        <span className="strength-slider__label">Strength</span>
        <span className="strength-slider__value">{strengthLabels[strength]}</span>
      </div>
      <input
        type="range"
        className="strength-slider__input"
        min={STRENGTH_LEVELS.EXTRA_LIGHT}
        max={STRENGTH_LEVELS.EXTRA_BOLD}
        step={1}
        value={strength}
        onChange={handleChange}
        aria-label="Coffee strength"
      />
      <div className="strength-slider__labels">
        <span>X-Light</span>
        <span>Light</span>
        <span>Medium</span>
        <span>Bold</span>
        <span>X-Bold</span>
      </div>
    </div>
  );
}
