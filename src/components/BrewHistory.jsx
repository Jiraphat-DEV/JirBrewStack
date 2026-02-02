import { useState } from 'react';
import { recipes, strengthLabels } from '../data/recipes';
import './BrewHistory.css';

export function BrewHistory({
  brews,
  savedRecipes,
  insights,
  onLoadRecipe,
  onDeleteRecipe,
  onClearAllData,
  onClose,
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    if (onClearAllData) {
      onClearAllData();
    }
    setShowResetConfirm(false);
  };
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return `Today ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`history__star ${i < rating ? 'history__star--filled' : ''}`}>
        {i < rating ? '\u2605' : '\u2606'}
      </span>
    ));
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return '\u2197\uFE0F';
      case 'declining':
        return '\u2198\uFE0F';
      case 'stable':
        return '\u2194\uFE0F';
      default:
        return '';
    }
  };

  const getTrendLabel = (trend) => {
    switch (trend) {
      case 'improving':
        return 'Improving!';
      case 'declining':
        return 'Declining';
      case 'stable':
        return 'Stable';
      default:
        return '';
    }
  };

  return (
    <div className="history">
      <div className="history__header">
        <button className="history__back-btn" onClick={onClose}>
          ← Back
        </button>
        <h2 className="history__title">History</h2>
      </div>

      {insights.totalBrews > 0 && (
        <div className="history__insights">
          <h3 className="history__section-title">Your Insights</h3>
          <div className="history__insights-card">
            <div className="history__insight-row">
              <span className="history__insight-value">{insights.totalBrews} brews</span>
              <span className="history__insight-divider">•</span>
              <span className="history__insight-value">
                Avg {renderStars(Math.round(insights.averageRating))}
              </span>
            </div>
            {insights.bestBrew && (
              <div className="history__insight-item">
                <span className="history__insight-label">Best:</span>
                <span className="history__insight-text">
                  {recipes[insights.bestBrew.settings?.method]?.name || 'Unknown'} @{' '}
                  {strengthLabels[insights.bestBrew.settings?.strength] || 'Medium'}
                </span>
              </div>
            )}
            {insights.trend && (
              <div className="history__insight-item">
                <span className="history__insight-label">Trend:</span>
                <span className="history__insight-text">
                  {getTrendIcon(insights.trend)} {getTrendLabel(insights.trend)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {savedRecipes.length > 0 && (
        <div className="history__saved">
          <h3 className="history__section-title">Saved Recipes</h3>
          <div className="history__list">
            {savedRecipes.map((recipe) => (
              <div key={recipe.id} className="history__recipe-card">
                <div className="history__recipe-info">
                  <div className="history__recipe-name">{recipe.name}</div>
                  <div className="history__recipe-details">
                    {recipes[recipe.settings?.method]?.name || 'Unknown'} •{' '}
                    {strengthLabels[recipe.settings?.strength] || 'Medium'} •{' '}
                    {recipe.settings?.coffee}g
                  </div>
                </div>
                <div className="history__recipe-actions">
                  <button
                    className="history__recipe-btn history__recipe-btn--load"
                    onClick={() => onLoadRecipe(recipe)}
                  >
                    Load
                  </button>
                  <button
                    className="history__recipe-btn history__recipe-btn--delete"
                    onClick={() => onDeleteRecipe(recipe.id)}
                    aria-label="Delete recipe"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="history__brews">
        <h3 className="history__section-title">Recent Brews</h3>
        {brews.length === 0 ? (
          <p className="history__empty">
            No brews yet. Complete a brew and rate it to start tracking!
          </p>
        ) : (
          <div className="history__list">
            {brews.slice(0, 10).map((brew) => (
              <div key={brew.id} className="history__brew-card">
                <div className="history__brew-header">
                  <span className="history__brew-date">{formatDate(brew.timestamp)}</span>
                  <span className="history__brew-rating">
                    {renderStars(brew.feedback?.overall || 0)}
                  </span>
                </div>
                <div className="history__brew-details">
                  {recipes[brew.settings?.method]?.name || 'Unknown'} •{' '}
                  {brew.settings?.coffee}g •{' '}
                  {strengthLabels[brew.settings?.strength] || 'Medium'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="history__settings">
        <h3 className="history__section-title">Settings</h3>
        <button
          className="history__reset-btn"
          onClick={() => setShowResetConfirm(true)}
        >
          🗑️ Reset All Data
        </button>
      </div>

      {showResetConfirm && (
        <div className="history__modal-overlay">
          <div className="history__modal">
            <h3 className="history__modal-title">Reset All Data?</h3>
            <p className="history__modal-text">This will permanently delete:</p>
            <ul className="history__modal-list">
              <li>{brews.length} brew records</li>
              <li>{savedRecipes.length} saved recipes</li>
              <li>All your preferences</li>
            </ul>
            <p className="history__modal-warning">This cannot be undone.</p>
            <div className="history__modal-actions">
              <button
                className="history__modal-btn"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="history__modal-btn history__modal-btn--danger"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
