import { useState, useMemo } from 'react';
import { FeedbackSlider } from './FeedbackSlider';
import { StarRating } from './StarRating';
import { SaveRecipeModal } from './SaveRecipeModal';
import {
  generateSuggestions,
  analyzeExtraction,
  getExtractionDescription,
  isBrewBalanced,
  applyAdjustments,
} from '../data/dialInLogic';
import './DialInAssistant.css';

export function DialInAssistant({
  brewSettings,
  onApplySuggestions,
  onSaveRecipe,
  onSaveBrew,
  onClose,
}) {
  const [feedback, setFeedback] = useState({
    sourness: 3,
    bitterness: 3,
    sweetness: 3,
    astringency: 3,
    strength: 3,
    overall: 3,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const suggestions = useMemo(
    () => generateSuggestions(feedback, brewSettings),
    [feedback, brewSettings]
  );

  const extraction = useMemo(() => analyzeExtraction(feedback), [feedback]);
  const extractionInfo = useMemo(
    () => getExtractionDescription(extraction),
    [extraction]
  );

  const isBalanced = isBrewBalanced(feedback);

  const handleFeedbackChange = (field) => (value) => {
    setFeedback((prev) => ({ ...prev, [field]: value }));
  };

  const handleGetSuggestions = () => {
    // Save the brew to history
    if (onSaveBrew) {
      onSaveBrew(brewSettings, feedback);
    }

    if (isBalanced) {
      setShowSaveModal(true);
    } else {
      setShowSuggestions(true);
    }
  };

  const handleApplyAndBrew = () => {
    const newSettings = applyAdjustments(brewSettings, suggestions);
    onApplySuggestions(newSettings);
  };

  const handleSaveRecipe = (name) => {
    if (onSaveRecipe) {
      onSaveRecipe(name, brewSettings);
    }
    setShowSaveModal(false);
    onClose();
  };

  const handleBack = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
    } else {
      onClose();
    }
  };

  if (showSaveModal) {
    return (
      <SaveRecipeModal
        settings={brewSettings}
        onSave={handleSaveRecipe}
        onClose={() => {
          setShowSaveModal(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="dial-in">
      <div className="dial-in__header">
        <button className="dial-in__back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h2 className="dial-in__title">
          {showSuggestions ? 'Suggestions' : 'Dial-In'}
        </h2>
      </div>

      {!showSuggestions ? (
        <div className="dial-in__feedback">
          <p className="dial-in__intro">How does your coffee taste?</p>

          <div className="dial-in__sliders">
            <FeedbackSlider
              label="Sourness"
              value={feedback.sourness}
              onChange={handleFeedbackChange('sourness')}
              leftLabel="Too Sour"
              centerLabel="Balanced"
              rightLabel="Not Sour"
            />

            <FeedbackSlider
              label="Bitterness"
              value={feedback.bitterness}
              onChange={handleFeedbackChange('bitterness')}
              leftLabel="Too Bitter"
              centerLabel="Balanced"
              rightLabel="Not Bitter"
            />

            <FeedbackSlider
              label="Sweetness"
              value={feedback.sweetness}
              onChange={handleFeedbackChange('sweetness')}
              leftLabel="Not Sweet"
              centerLabel="Moderate"
              rightLabel="Very Sweet"
            />

            <FeedbackSlider
              label="Astringency"
              value={feedback.astringency}
              onChange={handleFeedbackChange('astringency')}
              leftLabel="Dry/Rough"
              centerLabel="Balanced"
              rightLabel="Smooth"
            />

            <FeedbackSlider
              label="Strength"
              value={feedback.strength}
              onChange={handleFeedbackChange('strength')}
              leftLabel="Too Weak"
              centerLabel="Perfect"
              rightLabel="Too Strong"
            />

            <StarRating
              label="Overall Rating"
              value={feedback.overall}
              onChange={handleFeedbackChange('overall')}
            />
          </div>

          <button
            className="dial-in__btn dial-in__btn--primary"
            onClick={handleGetSuggestions}
          >
            Get Suggestions
          </button>
        </div>
      ) : (
        <div className="dial-in__suggestions">
          <div className="dial-in__extraction-card">
            <span className="dial-in__extraction-icon">{extractionInfo.icon}</span>
            <h3 className="dial-in__extraction-title">{extractionInfo.title}</h3>
            <p className="dial-in__extraction-desc">{extractionInfo.description}</p>
          </div>

          {suggestions.length > 0 ? (
            <>
              <h3 className="dial-in__suggestions-title">Try these adjustments:</h3>
              <div className="dial-in__suggestion-list">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="dial-in__suggestion-card">
                    <div className="dial-in__suggestion-header">
                      <span className="dial-in__suggestion-type">
                        {getSuggestionIcon(suggestion.type)} {suggestion.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="dial-in__suggestion-label">{suggestion.label}</div>
                    <div className="dial-in__suggestion-detail">{suggestion.detail}</div>
                    <div className="dial-in__suggestion-reason">
                      <span className="dial-in__suggestion-why">Why:</span> {suggestion.reason}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="dial-in__no-suggestions">
              Your brew is well-balanced! No adjustments needed.
            </p>
          )}

          <div className="dial-in__actions">
            {suggestions.some((s) => s.type === 'strength') && (
              <button
                className="dial-in__btn dial-in__btn--primary"
                onClick={handleApplyAndBrew}
              >
                Apply & Brew Again
              </button>
            )}
            <button
              className="dial-in__btn dial-in__btn--secondary"
              onClick={onClose}
            >
              Back to Calculator
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getSuggestionIcon(type) {
  switch (type) {
    case 'grind':
      return '\uD83D\uDD27';
    case 'temperature':
      return '\uD83C\uDF21';
    case 'strength':
      return '\u2615';
    case 'technique':
      return '\uD83D\uDCA1';
    case 'water':
      return '\uD83D\uDCA7';
    case 'beans':
      return '\uD83E\uDED8';
    default:
      return '\u2022';
  }
}
