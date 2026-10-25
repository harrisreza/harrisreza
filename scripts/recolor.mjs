// Swaps GitHub's contribution greens for the theme palette in generated SVGs
// (the pac-man action has no color options).
// Usage: node scripts/recolor.mjs dist/pacman-contribution-graph-dark.svg dark
import fs from 'node:fs';
import { T } from './theme.mjs';

const [file, mode] = process.argv.slice(2);
const greens = mode === 'dark'
  ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
  : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const target = mode === 'dark' ? T.levels : T.lightLevels;

let svg = fs.readFileSync(file, 'utf8');
greens.forEach((g, i) => { if (i) svg = svg.replace(new RegExp(g, 'gi'), target[i]); });
fs.writeFileSync(file, svg);
console.log('recolored', file);
