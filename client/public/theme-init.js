// Runs before the app bundle to apply the stored theme's background color and
// browser theme-color immediately, so there is no flash of the wrong theme.
// Keep THEME_BACKGROUNDS in sync with src/theme/tokens.js (checked by a unit test).
(function () {
  var THEME_BACKGROUNDS = {
    'neutral-light': ['#F5F6F8', 'light'],
    'neutral-dark': ['#121417', 'dark'],
    playful: ['#FFF7EC', 'light'],
    meadow: ['#F6F3EC', 'light'],
  };
  var choice = 'system';
  try {
    choice = localStorage.getItem('pm.theme') || 'system';
  } catch {
    /* storage unavailable (private mode) */
  }
  if (!THEME_BACKGROUNDS[choice]) {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    choice = prefersDark ? 'neutral-dark' : 'neutral-light';
  }
  var bg = THEME_BACKGROUNDS[choice];
  var root = document.documentElement;
  root.setAttribute('data-theme', choice);
  root.style.backgroundColor = bg[0];
  root.style.colorScheme = bg[1];
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg[0]);
})();
