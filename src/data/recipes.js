export const METHODS = {
  AEROPRESS_STANDARD: 'aeropress-standard',
  AEROPRESS_INVERTED: 'aeropress-inverted',
  DRIP: 'drip',
};

export const STRENGTH_LEVELS = {
  EXTRA_LIGHT: 0,
  LIGHT: 1,
  MEDIUM: 2,
  BOLD: 3,
  EXTRA_BOLD: 4,
};

export const ROAST_LEVELS = {
  BLONDE: 'blonde',
  LIGHT: 'light',
  MEDIUM: 'medium',
  MEDIUM_DARK: 'medium-dark',
  DARK: 'dark',
};

export const BEAN_TYPES = {
  ARABICA: 'arabica',
  ROBUSTA: 'robusta',
  BLEND: 'blend',
};

export const roastLabels = {
  [ROAST_LEVELS.BLONDE]: 'Blonde',
  [ROAST_LEVELS.LIGHT]: 'Light',
  [ROAST_LEVELS.MEDIUM]: 'Medium',
  [ROAST_LEVELS.MEDIUM_DARK]: 'Med-Dark',
  [ROAST_LEVELS.DARK]: 'Dark',
};

export const beanTypeLabels = {
  [BEAN_TYPES.ARABICA]: 'Arabica',
  [BEAN_TYPES.ROBUSTA]: 'Robusta',
  [BEAN_TYPES.BLEND]: 'Blend',
};

export const roastTemperatureAdjustments = {
  [ROAST_LEVELS.BLONDE]: { min: 5, max: 5 },
  [ROAST_LEVELS.LIGHT]: { min: 3, max: 3 },
  [ROAST_LEVELS.MEDIUM]: { min: 0, max: 0 },
  [ROAST_LEVELS.MEDIUM_DARK]: { min: -3, max: -3 },
  [ROAST_LEVELS.DARK]: { min: -5, max: -5 },
};

export const roastDescriptions = {
  [ROAST_LEVELS.BLONDE]: 'Bright citrus, tea-like, highest acidity',
  [ROAST_LEVELS.LIGHT]: 'Fruity, floral, crisp acidity',
  [ROAST_LEVELS.MEDIUM]: 'Balanced, nutty, caramel sweetness',
  [ROAST_LEVELS.MEDIUM_DARK]: 'Rich chocolate, subtle spice, low acidity',
  [ROAST_LEVELS.DARK]: 'Bold, smoky, bitter-sweet finish',
};

export const beanTypeDescriptions = {
  [BEAN_TYPES.ARABICA]: 'Sweet, fruity, complex (1.5% caffeine)',
  [BEAN_TYPES.ROBUSTA]: 'Bold, bitter, earthy (2.7% caffeine)',
  [BEAN_TYPES.BLEND]: 'Balanced combination of both',
};

export const grindClicksByMethod = {
  [METHODS.AEROPRESS_STANDARD]: { clicks: 12, note: 'Fine-medium (11-14 range)' },
  [METHODS.AEROPRESS_INVERTED]: { clicks: 14, note: 'Medium (14-16 range)' },
  [METHODS.DRIP]: {
    getClicks: (cups) => cups <= 1 ? 16 : 18,
    getNote: (cups) => cups <= 1 ? '1 cup, medium (15-17 range)' : '2+ cups, medium (18-20 range)',
  },
};

export const recipes = {
  [METHODS.AEROPRESS_STANDARD]: {
    id: METHODS.AEROPRESS_STANDARD,
    name: 'AeroPress',
    subtitle: 'Standard',
    icon: '☕',
    ratios: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: 19,
      [STRENGTH_LEVELS.LIGHT]: 17,
      [STRENGTH_LEVELS.MEDIUM]: 15,
      [STRENGTH_LEVELS.BOLD]: 13,
      [STRENGTH_LEVELS.EXTRA_BOLD]: 11,
    },
    grindSize: 'Fine-medium',
    temperatures: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: { min: 78, max: 83 },
      [STRENGTH_LEVELS.LIGHT]: { min: 80, max: 85 },
      [STRENGTH_LEVELS.MEDIUM]: { min: 85, max: 90 },
      [STRENGTH_LEVELS.BOLD]: { min: 90, max: 95 },
      [STRENGTH_LEVELS.EXTRA_BOLD]: { min: 92, max: 96 },
    },
    totalTime: 120,
    steps: [
      {
        name: 'Add coffee',
        duration: 5,
        startTime: 0,
        instruction: 'Add ground coffee to the chamber',
        getInstruction: (values) => `Add ${values.coffee}g coffee to the chamber`,
        getAmount: () => null,
      },
      {
        name: 'Add water & stir',
        duration: 10,
        startTime: 5,
        instruction: 'Pour water and stir gently',
        getInstruction: (values) => `Pour ${values.water}ml water and stir gently`,
        getAmount: (values) => ({ water: values.water, total: values.water }),
      },
      {
        name: 'Steep',
        duration: 80,
        startTime: 15,
        instruction: 'Let the coffee steep',
        getInstruction: () => 'Let the coffee steep',
        getAmount: () => null,
      },
      {
        name: 'Press slowly',
        duration: 25,
        startTime: 95,
        instruction: 'Press down slowly and evenly',
        getInstruction: () => 'Press down slowly and evenly',
        getAmount: () => null,
      },
    ],
    tips: [
      'Use freshly ground coffee for best results',
      'Wet the paper filter before brewing',
      'Press slowly to avoid bitterness',
    ],
    flavorNotes: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: 'Very light, tea-like with delicate notes',
      [STRENGTH_LEVELS.LIGHT]: 'Light, tea-like body with bright acidity',
      [STRENGTH_LEVELS.MEDIUM]: 'Balanced flavor with smooth finish',
      [STRENGTH_LEVELS.BOLD]: 'Bold, full-bodied with rich intensity',
      [STRENGTH_LEVELS.EXTRA_BOLD]: 'Very bold, concentrated with deep flavor',
    },
  },

  [METHODS.AEROPRESS_INVERTED]: {
    id: METHODS.AEROPRESS_INVERTED,
    name: 'AeroPress',
    subtitle: 'Inverted',
    icon: '🔄',
    ratios: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: 18,
      [STRENGTH_LEVELS.LIGHT]: 16,
      [STRENGTH_LEVELS.MEDIUM]: 14,
      [STRENGTH_LEVELS.BOLD]: 12,
      [STRENGTH_LEVELS.EXTRA_BOLD]: 10,
    },
    grindSize: 'Medium',
    temperatures: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: { min: 80, max: 85 },
      [STRENGTH_LEVELS.LIGHT]: { min: 82, max: 87 },
      [STRENGTH_LEVELS.MEDIUM]: { min: 87, max: 92 },
      [STRENGTH_LEVELS.BOLD]: { min: 92, max: 96 },
      [STRENGTH_LEVELS.EXTRA_BOLD]: { min: 94, max: 98 },
    },
    totalTime: 150,
    steps: [
      {
        name: 'Add coffee',
        duration: 5,
        startTime: 0,
        instruction: 'Add coffee to inverted chamber',
        getInstruction: (values) => `Add ${values.coffee}g coffee to inverted chamber`,
        getAmount: () => null,
      },
      {
        name: 'Add water',
        duration: 10,
        startTime: 5,
        instruction: 'Pour hot water over coffee',
        getInstruction: (values) => `Pour ${values.water}ml hot water over coffee`,
        getAmount: (values) => ({ water: values.water, total: values.water }),
      },
      {
        name: 'Stir gently',
        duration: 5,
        startTime: 15,
        instruction: 'Stir 3-4 times',
        getInstruction: () => 'Stir 3-4 times',
        getAmount: () => null,
      },
      {
        name: 'Steep',
        duration: 100,
        startTime: 20,
        instruction: 'Let it steep with cap on',
        getInstruction: () => 'Let it steep with cap on',
        getAmount: () => null,
      },
      {
        name: 'Flip & press',
        duration: 30,
        startTime: 120,
        instruction: 'Flip onto mug and press slowly',
        getInstruction: () => 'Flip onto mug and press slowly',
        getAmount: () => null,
      },
    ],
    tips: [
      'Be careful when flipping - ensure a secure grip',
      'Longer steep time extracts more flavor',
      'Great for experimenting with ratios',
    ],
    flavorNotes: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: 'Very clean, light with subtle sweetness',
      [STRENGTH_LEVELS.LIGHT]: 'Clean, delicate with subtle sweetness',
      [STRENGTH_LEVELS.MEDIUM]: 'Well-rounded with pronounced flavors',
      [STRENGTH_LEVELS.BOLD]: 'Concentrated, espresso-like intensity',
      [STRENGTH_LEVELS.EXTRA_BOLD]: 'Very concentrated, syrupy body',
    },
  },

  [METHODS.DRIP]: {
    id: METHODS.DRIP,
    name: 'Pour-over',
    subtitle: 'Drip',
    icon: '💧',
    ratios: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: 20,
      [STRENGTH_LEVELS.LIGHT]: 18,
      [STRENGTH_LEVELS.MEDIUM]: 16,
      [STRENGTH_LEVELS.BOLD]: 14,
      [STRENGTH_LEVELS.EXTRA_BOLD]: 12,
    },
    grindSize: 'Medium',
    temperatures: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: { min: 86, max: 90 },
      [STRENGTH_LEVELS.LIGHT]: { min: 88, max: 92 },
      [STRENGTH_LEVELS.MEDIUM]: { min: 92, max: 94 },
      [STRENGTH_LEVELS.BOLD]: { min: 94, max: 96 },
      [STRENGTH_LEVELS.EXTRA_BOLD]: { min: 95, max: 98 },
    },
    totalTime: 210,
    steps: [
      {
        name: 'Bloom',
        duration: 30,
        startTime: 0,
        instruction: 'Add 2x coffee weight in water, let bloom',
        getInstruction: (values) => `Pour ${values.coffee * 2}ml water (2× coffee weight)`,
        getAmount: (values) => ({ water: values.coffee * 2, total: values.coffee * 2 }),
      },
      {
        name: 'First pour',
        duration: 45,
        startTime: 30,
        instruction: 'Pour slowly to 60% of total water',
        getInstruction: (values) => {
          const bloomWater = values.coffee * 2;
          const firstPourTotal = Math.round(values.water * 0.6);
          const firstPourAdd = firstPourTotal - bloomWater;
          return `Pour ${firstPourAdd}ml (${firstPourTotal}ml total)`;
        },
        getAmount: (values) => {
          const bloomWater = values.coffee * 2;
          const firstPourTotal = Math.round(values.water * 0.6);
          return { water: firstPourTotal - bloomWater, total: firstPourTotal };
        },
      },
      {
        name: 'Second pour',
        duration: 45,
        startTime: 75,
        instruction: 'Pour remaining water in circles',
        getInstruction: (values) => {
          const firstPourTotal = Math.round(values.water * 0.6);
          const remaining = values.water - firstPourTotal;
          return `Pour ${remaining}ml (${values.water}ml total)`;
        },
        getAmount: (values) => {
          const firstPourTotal = Math.round(values.water * 0.6);
          return { water: values.water - firstPourTotal, total: values.water };
        },
      },
      {
        name: 'Drawdown',
        duration: 90,
        startTime: 120,
        instruction: 'Wait for complete drawdown',
        getInstruction: () => 'Wait for complete drawdown',
        getAmount: () => null,
      },
    ],
    tips: [
      'Pour in slow, concentric circles',
      'Keep the water level consistent',
      'Rinse paper filter to remove papery taste',
    ],
    flavorNotes: {
      [STRENGTH_LEVELS.EXTRA_LIGHT]: 'Very crisp, light with subtle aromatics',
      [STRENGTH_LEVELS.LIGHT]: 'Crisp, clean with delicate aromatics',
      [STRENGTH_LEVELS.MEDIUM]: 'Balanced sweetness with clarity',
      [STRENGTH_LEVELS.BOLD]: 'Rich, complex with lingering finish',
      [STRENGTH_LEVELS.EXTRA_BOLD]: 'Very rich, full-bodied intensity',
    },
  },
};

export const strengthLabels = {
  [STRENGTH_LEVELS.EXTRA_LIGHT]: 'Extra Light',
  [STRENGTH_LEVELS.LIGHT]: 'Light',
  [STRENGTH_LEVELS.MEDIUM]: 'Medium',
  [STRENGTH_LEVELS.BOLD]: 'Bold',
  [STRENGTH_LEVELS.EXTRA_BOLD]: 'Extra Bold',
};

export const ML_PER_CUP = 240;

export function calculateFromCoffee(coffeeGrams, ratio) {
  const water = Math.round(coffeeGrams * ratio);
  const cups = +(water / ML_PER_CUP).toFixed(1);
  return { coffee: coffeeGrams, water, cups };
}

export function calculateFromWater(waterMl, ratio) {
  const coffee = Math.round(waterMl / ratio);
  const cups = +(waterMl / ML_PER_CUP).toFixed(1);
  return { coffee, water: waterMl, cups };
}

export function calculateFromCups(cups, ratio) {
  const water = Math.round(cups * ML_PER_CUP);
  const coffee = Math.round(water / ratio);
  return { coffee, water, cups };
}

export function getAdjustedTemperature(baseTemp, roastLevel) {
  const adjustment = roastTemperatureAdjustments[roastLevel];
  return {
    min: baseTemp.min + adjustment.min,
    max: baseTemp.max + adjustment.max,
  };
}

export function getGrindClicks(method, cups = 1) {
  const grindInfo = grindClicksByMethod[method];
  if (grindInfo.getClicks) {
    return {
      clicks: grindInfo.getClicks(cups),
      note: grindInfo.getNote(cups),
    };
  }
  return { clicks: grindInfo.clicks, note: grindInfo.note };
}
