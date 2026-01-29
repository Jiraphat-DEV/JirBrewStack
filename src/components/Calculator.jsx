import { useEffect } from 'react';
import { InputField } from './InputField';
import { StrengthSlider } from './StrengthSlider';
import { RoastSelector } from './RoastSelector';
import { BeanTypeSelector } from './BeanTypeSelector';
import { GrindDisplay } from './GrindDisplay';
import {
  recipes,
  calculateFromCoffee,
  calculateFromWater,
  calculateFromCups,
  getAdjustedTemperature,
} from '../data/recipes';
import './Calculator.css';

export function Calculator({
  method,
  strength,
  onStrengthChange,
  roastLevel,
  onRoastChange,
  beanType,
  onBeanTypeChange,
  onStartBrew,
  values,
  onValuesChange,
}) {
  const recipe = recipes[method];
  const ratio = recipe.ratios[strength];
  const baseTemp = recipe.temperatures[strength];
  const temp = getAdjustedTemperature(baseTemp, roastLevel);
  const flavorNote = recipe.flavorNotes[strength];

  const handleCoffeeChange = (coffee) => {
    const newValues = calculateFromCoffee(coffee, ratio);
    onValuesChange({ ...newValues, lastChanged: 'coffee' });
  };

  const handleWaterChange = (water) => {
    const newValues = calculateFromWater(water, ratio);
    onValuesChange({ ...newValues, lastChanged: 'water' });
  };

  const handleCupsChange = (cups) => {
    const newValues = calculateFromCups(cups, ratio);
    onValuesChange({ ...newValues, lastChanged: 'cups' });
  };

  useEffect(() => {
    if (values.lastChanged === 'coffee') {
      const newValues = calculateFromCoffee(values.coffee, ratio);
      onValuesChange({ ...newValues, lastChanged: 'coffee' });
    } else if (values.lastChanged === 'water') {
      const newValues = calculateFromWater(values.water, ratio);
      onValuesChange({ ...newValues, lastChanged: 'water' });
    } else if (values.lastChanged === 'cups') {
      const newValues = calculateFromCups(values.cups, ratio);
      onValuesChange({ ...newValues, lastChanged: 'cups' });
    }
  }, [ratio]);

  return (
    <div className="calculator">
      <div className="calculator__inputs">
        <InputField
          label="Coffee"
          value={values.coffee}
          unit="g"
          onChange={handleCoffeeChange}
          min={1}
          max={100}
        />
        <InputField
          label="Water"
          value={values.water}
          unit="ml"
          onChange={handleWaterChange}
          min={10}
          max={2000}
          step={10}
        />
        <InputField
          label="Cups"
          value={values.cups}
          unit="cups"
          onChange={handleCupsChange}
          min={0.1}
          max={10}
          step={0.1}
        />
      </div>

      <StrengthSlider strength={strength} onStrengthChange={onStrengthChange} />
      <RoastSelector roastLevel={roastLevel} onRoastChange={onRoastChange} />
      <BeanTypeSelector beanType={beanType} onBeanTypeChange={onBeanTypeChange} />

      <GrindDisplay method={method} cups={values.cups} />

      <div className="calculator__info">
        <div className="calculator__info-item">
          <span className="calculator__info-label">Ratio</span>
          <span className="calculator__info-value">1:{ratio}</span>
        </div>
        <div className="calculator__info-item">
          <span className="calculator__info-label">Temp</span>
          <span className="calculator__info-value">{temp.min}-{temp.max}°C</span>
        </div>
      </div>

      <div className="calculator__flavor">
        <span className="calculator__flavor-label">Flavor Profile</span>
        <p className="calculator__flavor-note">{flavorNote}</p>
      </div>

      <button className="calculator__start-btn" onClick={onStartBrew}>
        Start Brewing
      </button>

      <div className="calculator__tips">
        <h4 className="calculator__tips-title">Tips</h4>
        <ul className="calculator__tips-list">
          {recipe.tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
