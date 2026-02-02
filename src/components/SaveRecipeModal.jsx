import { useState } from 'react';
import { recipes, strengthLabels, roastLabels } from '../data/recipes';
import './SaveRecipeModal.css';

export function SaveRecipeModal({ settings, onSave, onClose }) {
  const [name, setName] = useState('');
  const recipe = recipes[settings.method];

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSave();
    }
  };

  return (
    <div className="save-recipe-modal__overlay" onClick={onClose}>
      <div className="save-recipe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="save-recipe-modal__header">
          <span className="save-recipe-modal__icon">✨</span>
          <h2 className="save-recipe-modal__title">Great Brew!</h2>
        </div>

        <p className="save-recipe-modal__description">
          Your coffee is perfectly dialed in! Would you like to save these settings for later?
        </p>

        <div className="save-recipe-modal__input-group">
          <label htmlFor="recipe-name" className="save-recipe-modal__label">
            Recipe Name
          </label>
          <input
            id="recipe-name"
            type="text"
            className="save-recipe-modal__input"
            placeholder="My Perfect Brew"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="save-recipe-modal__settings">
          <h3 className="save-recipe-modal__settings-title">Settings to save:</h3>
          <ul className="save-recipe-modal__settings-list">
            <li>{recipe?.name} {recipe?.subtitle}</li>
            <li>{settings.coffee}g coffee / {settings.water}ml water</li>
            <li>{strengthLabels[settings.strength]} strength</li>
            <li>{roastLabels[settings.roast]} roast</li>
          </ul>
        </div>

        <div className="save-recipe-modal__actions">
          <button
            className="save-recipe-modal__btn save-recipe-modal__btn--secondary"
            onClick={onClose}
          >
            Maybe Later
          </button>
          <button
            className="save-recipe-modal__btn save-recipe-modal__btn--primary"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
