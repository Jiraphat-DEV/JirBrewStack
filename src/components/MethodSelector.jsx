import { recipes, METHODS } from '../data/recipes';
import './MethodSelector.css';

const methodOrder = [METHODS.AEROPRESS_STANDARD, METHODS.AEROPRESS_INVERTED, METHODS.DRIP];

export function MethodSelector({ selectedMethod, onMethodChange }) {
  return (
    <div className="method-selector">
      {methodOrder.map((methodId) => {
        const recipe = recipes[methodId];
        const isSelected = selectedMethod === methodId;

        return (
          <button
            key={methodId}
            className={`method-selector__btn ${isSelected ? 'method-selector__btn--active' : ''}`}
            onClick={() => onMethodChange(methodId)}
            aria-pressed={isSelected}
          >
            <span className="method-selector__icon">{recipe.icon}</span>
            <span className="method-selector__name">{recipe.name}</span>
            <span className="method-selector__subtitle">{recipe.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
