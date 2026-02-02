export const EXTRACTION_STATUS = {
  UNDER: 'under',
  BALANCED: 'balanced',
  OVER: 'over',
  UNEVEN: 'uneven',
};

export function analyzeExtraction(feedback) {
  const { sourness, bitterness } = feedback;

  // Sour (1-2) with not bitter (3-5) = under-extracted
  if (sourness <= 2 && bitterness >= 3) return EXTRACTION_STATUS.UNDER;

  // Bitter (1-2) with not sour (3-5) = over-extracted
  if (bitterness <= 2 && sourness >= 3) return EXTRACTION_STATUS.OVER;

  // Both sour AND bitter = uneven extraction (channeling, water quality)
  if (sourness <= 2 && bitterness <= 2) return EXTRACTION_STATUS.UNEVEN;

  return EXTRACTION_STATUS.BALANCED;
}

export function generateSuggestions(feedback, currentSettings) {
  const extraction = analyzeExtraction(feedback);
  const suggestions = [];
  const { sourness, bitterness, strength, sweetness, astringency } = feedback;

  // Under-extraction: too sour
  if (extraction === EXTRACTION_STATUS.UNDER) {
    suggestions.push({
      type: 'grind',
      direction: 'finer',
      clicks: -2,
      label: 'Grind finer',
      detail: '2 clicks finer',
      reason: 'Finer grind increases surface area for better extraction',
    });
    suggestions.push({
      type: 'temperature',
      direction: 'higher',
      amount: 3,
      label: 'Increase temperature',
      detail: '+3°C hotter water',
      reason: 'Higher temperature extracts more flavor compounds',
    });
  }

  // Over-extraction: too bitter
  if (extraction === EXTRACTION_STATUS.OVER) {
    suggestions.push({
      type: 'grind',
      direction: 'coarser',
      clicks: 2,
      label: 'Grind coarser',
      detail: '2 clicks coarser',
      reason: 'Coarser grind reduces extraction, decreasing bitterness',
    });
    suggestions.push({
      type: 'temperature',
      direction: 'lower',
      amount: -3,
      label: 'Lower temperature',
      detail: '-3°C cooler water',
      reason: 'Lower temperature slows extraction rate',
    });
  }

  // Uneven extraction: both sour AND bitter
  if (extraction === EXTRACTION_STATUS.UNEVEN) {
    suggestions.push({
      type: 'grind',
      direction: 'coarser',
      clicks: 1,
      label: 'Grind slightly coarser',
      detail: '1 click coarser',
      reason: 'May help with channeling issues',
    });
    suggestions.push({
      type: 'technique',
      label: 'Check your technique',
      detail: 'Improve water distribution',
      reason: 'Ensure even saturation of grounds and check water quality',
    });
  }

  // Strength adjustments (independent of extraction)
  if (strength <= 2) {
    // Too weak
    suggestions.push({
      type: 'strength',
      direction: 'stronger',
      levels: 1,
      label: 'Increase strength',
      detail: '+1 strength level',
      reason: 'More coffee relative to water increases body',
    });
  } else if (strength >= 4) {
    // Too strong
    suggestions.push({
      type: 'strength',
      direction: 'weaker',
      levels: -1,
      label: 'Decrease strength',
      detail: '-1 strength level',
      reason: 'Less coffee relative to water for lighter body',
    });
  }

  // Astringency handling (dry, puckering mouthfeel from tannins)
  if (astringency !== undefined && astringency <= 2) {
    suggestions.push({
      type: 'grind',
      direction: 'coarser',
      clicks: 2,
      label: 'Grind coarser',
      detail: '2 clicks coarser',
      reason: 'Coarser grind reduces tannin extraction, decreasing astringency',
    });
    suggestions.push({
      type: 'temperature',
      direction: 'lower',
      amount: -3,
      label: 'Lower temperature',
      detail: '-3°C cooler water',
      reason: 'Lower temperature reduces polyphenol extraction',
    });
    suggestions.push({
      type: 'water',
      label: 'Check water quality',
      detail: 'Use filtered water',
      reason: 'Hard water can increase astringency',
    });
  }

  // Sweetness handling (depends on other factors)
  if (sweetness !== undefined && sweetness <= 2) {
    if (sourness <= 2) {
      // Under-extracted - already handled by sourness logic
      // No additional suggestions needed
    } else if (bitterness <= 2) {
      // Over-extracted - already handled by bitterness logic
      // No additional suggestions needed
    } else {
      // Balanced extraction but not sweet - check freshness
      suggestions.push({
        type: 'beans',
        label: 'Check coffee freshness',
        detail: 'Use beans within 2-4 weeks of roast',
        reason: 'Stale coffee loses sweetness',
      });
      suggestions.push({
        type: 'water',
        label: 'Check water quality',
        detail: 'Use filtered water with balanced minerals',
        reason: 'Water composition affects perceived sweetness',
      });
    }
  }

  return suggestions;
}

export function getExtractionDescription(extraction) {
  switch (extraction) {
    case EXTRACTION_STATUS.UNDER:
      return {
        title: 'Under-extracted',
        description: 'Your coffee needs more extraction for balance. The sour flavors indicate not enough compounds were dissolved.',
        icon: '🍋',
      };
    case EXTRACTION_STATUS.OVER:
      return {
        title: 'Over-extracted',
        description: 'Your coffee is over-extracted. Too many bitter compounds were dissolved, masking the sweetness.',
        icon: '🔥',
      };
    case EXTRACTION_STATUS.UNEVEN:
      return {
        title: 'Uneven extraction',
        description: 'Both sour and bitter notes suggest uneven extraction. This could be from channeling or water quality issues.',
        icon: '⚠️',
      };
    case EXTRACTION_STATUS.BALANCED:
    default:
      return {
        title: 'Well-balanced',
        description: 'Your extraction looks good! The balance between sour and bitter is in a good range.',
        icon: '✨',
      };
  }
}

export function isBrewBalanced(feedback) {
  const { sourness, bitterness, strength, sweetness, astringency, overall } = feedback;
  return (
    sourness === 3 &&
    bitterness === 3 &&
    strength === 3 &&
    (sweetness === undefined || sweetness >= 3) &&
    (astringency === undefined || astringency >= 3) &&
    overall >= 4
  );
}

export function applyAdjustments(currentSettings, suggestions) {
  const newSettings = { ...currentSettings };

  for (const suggestion of suggestions) {
    switch (suggestion.type) {
      case 'strength':
        if (suggestion.direction === 'stronger') {
          newSettings.strength = Math.min(4, currentSettings.strength + 1);
        } else {
          newSettings.strength = Math.max(0, currentSettings.strength - 1);
        }
        break;
      // Grind and temperature are informational only -
      // users adjust these manually on their equipment
    }
  }

  return newSettings;
}

// Grind adjustment constants for reference
export const GRIND_ADJUSTMENTS = {
  finer: { clicks: -2, description: 'Grind 2 clicks finer' },
  slightlyFiner: { clicks: -1, description: 'Grind 1 click finer' },
  coarser: { clicks: 2, description: 'Grind 2 clicks coarser' },
  slightlyCoarser: { clicks: 1, description: 'Grind 1 click coarser' },
};

// Temperature adjustment constants for reference
export const TEMP_ADJUSTMENTS = {
  hotter: { amount: 3, description: '+3°C hotter water' },
  slightlyHotter: { amount: 2, description: '+2°C hotter water' },
  cooler: { amount: -3, description: '-3°C cooler water' },
  slightlyCooler: { amount: -2, description: '-2°C cooler water' },
};
