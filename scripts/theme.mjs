// Single source of truth for the profile's look. Change colors here, then run:
//   node scripts/build-assets.mjs
// The palette follows GitHub's contribution-grid greens so every asset
// (header, cards, stats, snake, pac-man) reads as one family.
export const T = {
  bg: '#0d1117',        // GitHub dark page background
  panel: '#0b1410',     // card / panel fill
  panel2: '#0f1a14',
  border: '#39d353',    // used with low opacity
  levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  accent: '#39d353',
  accentSoft: '#7ee787',
  accentDeep: '#238636',
  text: '#e6edf3',
  muted: '#8b949e',
  faint: '#484f58',
};

export const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
export const MONO = "Consolas, 'Fira Code', 'JetBrains Mono', Menlo, monospace";
