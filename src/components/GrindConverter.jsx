import { useState } from 'react';
import { GRINDERS, toMavo } from '../data/brew.js';
import './GrindConverter.css';

export default function GrindConverter() {
  const [clicks, setClicks] = useState({ c40: '', c2: '' });

  return (
    <section className="converter">
      <h2 className="converter__title">แปลงหน่วยบดเป็นเลขหน้าปัด Mavo</h2>
      {GRINDERS.map((grinder) => {
        const mavo = toMavo(clicks[grinder.key], grinder.key);
        return (
          <div key={grinder.key}>
            <div className="converter__row">
              <label className="converter__label" htmlFor={`converter-${grinder.key}`}>
                {grinder.label}
              </label>
              <input
                id={`converter-${grinder.key}`}
                className="converter__input"
                type="number"
                inputMode="numeric"
                min="0"
                value={clicks[grinder.key]}
                onChange={(e) => setClicks((prev) => ({ ...prev, [grinder.key]: e.target.value }))}
              />
              <span className="converter__result">{mavo === null ? '' : `Mavo ${mavo.toFixed(1)}`}</span>
            </div>
            {grinder.warning && <p className="converter__warning">{grinder.warning}</p>}
          </div>
        );
      })}
    </section>
  );
}
