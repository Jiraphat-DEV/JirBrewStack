import { ROAST_LEVELS, roastLabels, roastDescriptions } from '../data/recipes';
import './RoastSelector.css';

const ROAST_VALUES = {
  [ROAST_LEVELS.BLONDE]: 0,
  [ROAST_LEVELS.LIGHT]: 1,
  [ROAST_LEVELS.MEDIUM]: 2,
  [ROAST_LEVELS.MEDIUM_DARK]: 3,
  [ROAST_LEVELS.DARK]: 4,
};

const VALUE_TO_ROAST = {
  0: ROAST_LEVELS.BLONDE,
  1: ROAST_LEVELS.LIGHT,
  2: ROAST_LEVELS.MEDIUM,
  3: ROAST_LEVELS.MEDIUM_DARK,
  4: ROAST_LEVELS.DARK,
};

export function RoastSelector({ roastLevel, onRoastChange }) {
  const handleChange = (e) => {
    const value = parseInt(e.target.value, 10);
    onRoastChange(VALUE_TO_ROAST[value]);
  };

  return (
    <div className="roast-selector">
      <div className="roast-selector__header">
        <span className="roast-selector__label">Roast Level</span>
        <span className="roast-selector__value">{roastLabels[roastLevel]}</span>
      </div>
      <input
        type="range"
        className="roast-selector__input"
        min={0}
        max={4}
        step={1}
        value={ROAST_VALUES[roastLevel]}
        onChange={handleChange}
        aria-label="Roast level"
      />
      <div className="roast-selector__labels">
        <span>Blonde</span>
        <span>Light</span>
        <span>Medium</span>
        <span>M-Dark</span>
        <span>Dark</span>
      </div>
      <div className="roast-selector__description">
        {roastDescriptions[roastLevel]}
      </div>
    </div>
  );
}
