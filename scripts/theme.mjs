// Single source of truth for the profile's look. Change colors here, then run:
//   node scripts/build-assets.mjs
// Gold on warm charcoal. `levels` doubles as the contribution-grid scale, so the
// header, stats, snake and pac-man all share one palette.
export const T = {
  bg: '#0d1117',        // GitHub dark page background
  panel: '#13120f',     // card / panel fill
  panel2: '#1b1914',
  border: '#e3b341',    // used with low opacity
  levels: ['#1d1b16', '#3b2f14', '#6e5419', '#a8801f', '#e3b341'],
  lightLevels: ['#ebedf0', '#f5e0a3', '#e8c45c', '#c9971c', '#8a6510'],
  accent: '#e3b341',
  accentSoft: '#f2cc60',
  accentDeep: '#9e6a03',
  text: '#f0ece2',
  muted: '#a39c8a',
  faint: '#5c5649',
};

export const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
export const MONO = "Consolas, 'Fira Code', 'JetBrains Mono', Menlo, monospace";
