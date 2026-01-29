import { BEAN_TYPES, beanTypeLabels, beanTypeDescriptions } from '../data/recipes';
import './BeanTypeSelector.css';

export function BeanTypeSelector({ beanType, onBeanTypeChange }) {
  const handleChange = (e) => {
    onBeanTypeChange(e.target.value);
  };

  return (
    <div className="bean-type-selector">
      <div className="bean-type-selector__header">
        <span className="bean-type-selector__label">Bean Type</span>
      </div>
      <div className="bean-type-selector__options">
        {Object.values(BEAN_TYPES).map((type) => (
          <button
            key={type}
            className={`bean-type-selector__option ${beanType === type ? 'bean-type-selector__option--active' : ''}`}
            onClick={() => onBeanTypeChange(type)}
            type="button"
          >
            {beanTypeLabels[type]}
          </button>
        ))}
      </div>
      <div className="bean-type-selector__description">
        {beanTypeDescriptions[beanType]}
      </div>
    </div>
  );
}
