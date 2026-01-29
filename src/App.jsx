import { useState } from 'react';
import { Calculator } from './components/Calculator';
import { Timer } from './components/Timer';
import { MethodSelector } from './components/MethodSelector';
import { useLocalStorage } from './hooks/useLocalStorage';
import { METHODS, STRENGTH_LEVELS, ROAST_LEVELS, BEAN_TYPES } from './data/recipes';
import './App.css';

function App() {
  const [view, setView] = useState('calculator');
  const [method, setMethod] = useLocalStorage('jirbrewstack-method', METHODS.AEROPRESS_STANDARD);
  const [strength, setStrength] = useLocalStorage('jirbrewstack-strength', STRENGTH_LEVELS.MEDIUM);
  const [values, setValues] = useLocalStorage('jirbrewstack-values', {
    coffee: 15,
    water: 225,
    cups: 0.9,
    lastChanged: 'coffee',
  });
  const [roastLevel, setRoastLevel] = useLocalStorage('jirbrewstack-roast', ROAST_LEVELS.MEDIUM);
  const [beanType, setBeanType] = useLocalStorage('jirbrewstack-bean', BEAN_TYPES.ARABICA);

  const handleStartBrew = () => {
    setView('timer');
  };

  const handleBackToCalculator = () => {
    setView('calculator');
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">JirBrewStack</h1>
      </header>

      <main className="app__main">
        {view === 'calculator' && (
          <>
            <MethodSelector selectedMethod={method} onMethodChange={setMethod} />
            <Calculator
              method={method}
              strength={strength}
              onStrengthChange={setStrength}
              roastLevel={roastLevel}
              onRoastChange={setRoastLevel}
              beanType={beanType}
              onBeanTypeChange={setBeanType}
              onStartBrew={handleStartBrew}
              values={values}
              onValuesChange={setValues}
            />
          </>
        )}

        {view === 'timer' && (
          <Timer
            method={method}
            values={values}
            strength={strength}
            roastLevel={roastLevel}
            onBack={handleBackToCalculator}
          />
        )}
      </main>
    </div>
  );
}

export default App;
