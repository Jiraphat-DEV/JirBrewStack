import './InputField.css';

export function InputField({ label, value, unit, onChange, min = 0, max = 9999, step = 1 }) {
  const handleChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      onChange(0);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleDecrement = () => {
    const newVal = Math.max(min, value - step);
    onChange(parseFloat(newVal.toFixed(2)));
  };

  const handleIncrement = () => {
    const newVal = Math.min(max, value + step);
    onChange(parseFloat(newVal.toFixed(2)));
  };

  return (
    <div className="input-field">
      <label className="input-field__label">{label}</label>
      <div className="input-field__wrapper">
        <button
          type="button"
          className="input-field__btn input-field__btn--minus"
          onClick={handleDecrement}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          className="input-field__input"
          value={value || ''}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
        />
        <button
          type="button"
          className="input-field__btn input-field__btn--plus"
          onClick={handleIncrement}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        <span className="input-field__unit">{unit}</span>
      </div>
    </div>
  );
}
