const KEY = 'flappyKiroHighScore';

export function loadHighScore() {
  try {
    const val = localStorage.getItem(KEY);
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function saveHighScore(score) {
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    // silently ignore — localStorage may be unavailable
  }
}
