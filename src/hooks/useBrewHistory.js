import { useLocalStorage } from './useLocalStorage';

const HISTORY_KEY = 'coffeecal-brew-history';

const initialHistory = {
  brews: [],
  savedRecipes: [],
};

export function useBrewHistory() {
  const [history, setHistory] = useLocalStorage(HISTORY_KEY, initialHistory);

  const addBrew = (settings, feedback) => {
    const newBrew = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      settings: { ...settings },
      feedback: { ...feedback },
    };

    setHistory((prev) => ({
      ...prev,
      brews: [newBrew, ...prev.brews].slice(0, 50), // Keep last 50 brews
    }));

    return newBrew;
  };

  const saveRecipe = (name, settings) => {
    const newRecipe = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      settings: { ...settings },
    };

    setHistory((prev) => ({
      ...prev,
      savedRecipes: [...prev.savedRecipes, newRecipe],
    }));

    return newRecipe;
  };

  const loadRecipe = (id) => {
    return history.savedRecipes.find((r) => r.id === id);
  };

  const deleteRecipe = (id) => {
    setHistory((prev) => ({
      ...prev,
      savedRecipes: prev.savedRecipes.filter((r) => r.id !== id),
    }));
  };

  const getInsights = () => {
    const { brews } = history;

    if (brews.length === 0) {
      return {
        totalBrews: 0,
        averageRating: 0,
        bestBrew: null,
        mostUsedMethod: null,
        trend: null,
      };
    }

    // Total brews
    const totalBrews = brews.length;

    // Average rating
    const ratings = brews.map((b) => b.feedback?.overall || 0).filter((r) => r > 0);
    const averageRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    // Best brew (highest rated)
    const bestBrew = brews.reduce((best, current) => {
      if (!best) return current;
      return (current.feedback?.overall || 0) > (best.feedback?.overall || 0)
        ? current
        : best;
    }, null);

    // Most used method
    const methodCounts = brews.reduce((acc, brew) => {
      const method = brew.settings?.method;
      if (method) {
        acc[method] = (acc[method] || 0) + 1;
      }
      return acc;
    }, {});

    const mostUsedMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Trend (compare last 5 to previous 5)
    let trend = null;
    if (brews.length >= 5) {
      const recent = brews.slice(0, 5);
      const previous = brews.slice(5, 10);

      const recentAvg = recent.reduce((sum, b) => sum + (b.feedback?.overall || 0), 0) / recent.length;

      if (previous.length >= 3) {
        const prevAvg = previous.reduce((sum, b) => sum + (b.feedback?.overall || 0), 0) / previous.length;

        if (recentAvg > prevAvg + 0.3) {
          trend = 'improving';
        } else if (recentAvg < prevAvg - 0.3) {
          trend = 'declining';
        } else {
          trend = 'stable';
        }
      }
    }

    return {
      totalBrews,
      averageRating,
      bestBrew,
      mostUsedMethod,
      trend,
    };
  };

  const clearHistory = () => {
    setHistory(initialHistory);
  };

  return {
    brews: history.brews,
    savedRecipes: history.savedRecipes,
    addBrew,
    saveRecipe,
    loadRecipe,
    deleteRecipe,
    insights: getInsights(),
    clearHistory,
  };
}
