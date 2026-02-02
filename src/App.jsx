import { useState } from 'react';
import { Calculator } from './components/Calculator';
import { Timer } from './components/Timer';
import { MethodSelector } from './components/MethodSelector';
import { DialInAssistant } from './components/DialInAssistant';
import { BrewHistory } from './components/BrewHistory';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useBrewHistory } from './hooks/useBrewHistory';
import { METHODS, STRENGTH_LEVELS, ROAST_LEVELS, BEAN_TYPES, getGrindClicks } from './data/recipes';
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
  const [lastBrewSettings, setLastBrewSettings] = useState(null);

  const {
    brews,
    savedRecipes,
    insights,
    addBrew,
    saveRecipe,
    loadRecipe,
    deleteRecipe,
    clearAllData,
  } = useBrewHistory();

  const handleStartBrew = () => {
    setView('timer');
  };

  const handleBackToCalculator = () => {
    setView('calculator');
  };

  const handleRateBrew = () => {
    const grindInfo = getGrindClicks(method, values.cups);
    setLastBrewSettings({
      method,
      strength,
      roast: roastLevel,
      beanType,
      coffee: values.coffee,
      water: values.water,
      cups: values.cups,
      grindClicks: grindInfo.clicks,
    });
    setView('dialin');
  };

  const handleApplySuggestions = (newSettings) => {
    if (newSettings.strength !== undefined) {
      setStrength(newSettings.strength);
    }
    setView('calculator');
  };

  const handleSaveRecipe = (name, settings) => {
    saveRecipe(name, settings);
  };

  const handleSaveBrew = (settings, feedback) => {
    addBrew(settings, feedback);
  };

  const handleLoadRecipe = (recipe) => {
    if (recipe.settings) {
      setMethod(recipe.settings.method);
      setStrength(recipe.settings.strength);
      setRoastLevel(recipe.settings.roast);
      if (recipe.settings.beanType) {
        setBeanType(recipe.settings.beanType);
      }
      setValues({
        coffee: recipe.settings.coffee,
        water: recipe.settings.water,
        cups: recipe.settings.cups || recipe.settings.water / 240,
        lastChanged: 'coffee',
      });
    }
    setView('calculator');
  };

  const handleViewHistory = () => {
    setView('history');
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">JirBrewStack</h1>
        {view === 'calculator' && (
          <button className="app__history-btn" onClick={handleViewHistory}>
            History
          </button>
        )}
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
            onRateBrew={handleRateBrew}
          />
        )}

        {view === 'dialin' && lastBrewSettings && (
          <DialInAssistant
            brewSettings={lastBrewSettings}
            onApplySuggestions={handleApplySuggestions}
            onSaveRecipe={handleSaveRecipe}
            onSaveBrew={handleSaveBrew}
            onClose={handleBackToCalculator}
          />
        )}

        {view === 'history' && (
          <BrewHistory
            brews={brews}
            savedRecipes={savedRecipes}
            insights={insights}
            onLoadRecipe={handleLoadRecipe}
            onDeleteRecipe={deleteRecipe}
            onClearAllData={clearAllData}
            onClose={handleBackToCalculator}
          />
        )}
      </main>
    </div>
  );
}

export default App;
