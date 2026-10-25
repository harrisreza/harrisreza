// Builds an animated GitHub stats card from the contribution calendar.
// Usage: GITHUB_TOKEN=... GH_USER=harrisreza node scripts/stats.mjs dist/stats.svg
//        node scripts/stats.mjs out.svg --demo   (render with fake data, no token needed)
import fs from 'node:fs';
import path from 'node:path';
import { T, FONT, MONO } from './theme.mjs';

const outFile = process.argv[2] || 'dist/stats.svg';
const demo = process.argv.includes('--demo');
const login = process.env.GH_USER || 'harrisreza';

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function fetchDays() {
  const { user } = await gql(`query($login:String!){ user(login:$login){ createdAt } }`, { login });
  const days = [];
  const now = new Date();
  for (let y = new Date(user.createdAt).getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
    const from = new Date(Date.UTC(y, 0, 1)).toISOString();
    const to = (y === now.getUTCFullYear() ? now : new Date(Date.UTC(y, 11, 31, 23, 59, 59))).toISOString();
    const data = await gql(`query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){
      contributionsCollection(from:$from,to:$to){ contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      { login, from, to });
    for (const w of data.user.contributionsCollection.contributionCalendar.weeks)
      for (const d of w.contributionDays) days.push({ date: d.date, count: d.contributionCount });
  }
  const seen = new Set();
  return days.filter(d => !seen.has(d.date) && seen.add(d.date)).sort((a, b) => a.date.localeCompare(b.date));
}

function demoDays() {
  const days = [];
  for (let i = 560; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push({ date: d.toISOString().slice(0, 10), count: i < 9 ? 3 + (i % 4) : Math.random() < .55 ? Math.floor(Math.random() * 9) : 0 });
  }
  return days;
}

function compute(days) {
  const today = new Date().toISOString().slice(0, 10);
  days = days.filter(d => d.date <= today);
  const total = days.reduce((s, d) => s + d.count, 0);

  let longest = 0, run = 0;
  for (const d of days) { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }

  // Current streak stays alive if today has no contributions yet.
  let current = 0, i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  for (; i >= 0 && days[i].count > 0; i--) current++;

  const best = days.reduce((b, d) => (d.count > b.count ? d : b), { count: 0, date: '' });
  const year = today.slice(0, 4);
  const thisYear = days.filter(d => d.date.startsWith(year)).reduce((s, d) => s + d.count, 0);

  const months = [];
  const now = new Date();
  for (let m = 11; m >= 0; m--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
    const key = dt.toISOString().slice(0, 7);
    months.push({
      label: dt.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      count: days.filter(d => d.date.startsWith(key)).reduce((s, d) => s + d.count, 0),
    });
  }
  return { total, thisYear, year, current, longest, best, months, since: days[0]?.date };
}

const fmt = n => n.toLocaleString('en-US');
const fmtDate = s => s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';

function render(s) {
  const W = 1200, H = 372, PAD = 40;
  const plural = (n, w) => `${w}${n === 1 ? '' : 's'}`;
  const figures = [
    { label: 'Total contributions', value: fmt(s.total), sub: `since ${fmtDate(s.since)}` },
    { label: `Contributions in ${s.year}`, value: fmt(s.thisYear), sub: 'year to date' },
    { label: 'Current streak', value: s.current, sub: plural(s.current, 'day'), live: true },
    { label: 'Longest streak', value: s.longest, sub: plural(s.longest, 'day') },
  ];
  const colW = (W - PAD * 2) / figures.length;
  const figSvg = figures.map((f, i) => {
    const x = PAD + i * colW + (i ? 28 : 0);
    return `${i ? `<path d="M${PAD + i * colW + .5} 72V164" stroke="${T.faint}" stroke-opacity=".6"/>` : ''}
    <text x="${x}" y="92" font-size="13" fill="${T.muted}">${f.label}</text>
    <text x="${x}" y="140" font-size="44" font-weight="700" letter-spacing="-1" fill="${f.live ? T.accent : T.text}">${f.value}</text>
    <text x="${x}" y="162" font-size="13" fill="${T.faint}">${f.sub}</text>
    ${f.live && s.current ? `<circle cx="${x + 12 + String(f.value).length * 25}" cy="110" r="4" fill="${T.accent}"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}`;
  }).join('\n');

  // Monthly bars, colored on the contribution scale like GitHub's own grid.
  const top = 214, plotH = 72, baseY = top + plotH;
  const max = Math.max(1, ...s.months.map(m => m.count));
  const bw = (W - PAD * 2) / 12;
  const bars = s.months.map((m, i) => {
    const h = Math.max(2, (m.count / max) * plotH);
    const x = PAD + i * bw + 6, w = bw - 12, last = i === 11;
    return `<rect x="${x.toFixed(1)}" y="${(baseY - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${m.count ? T.levels[Math.max(1, Math.ceil((m.count / max) * 4))] : T.levels[0]}"/>
    <text x="${(x + w / 2).toFixed(1)}" y="${baseY + 20}" text-anchor="middle" font-size="12" fill="${last ? T.text : T.muted}">${m.label}</text>
    ${m.count ? `<text x="${(x + w / 2).toFixed(1)}" y="${(baseY - h - 7).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${T.muted}">${m.count}</text>` : ''}`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath></defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${T.panel}"/>
  <text x="${PAD}" y="44" font-size="15" font-weight="700" fill="${T.text}">Contribution activity</text>
  <text x="${W - PAD}" y="44" text-anchor="end" font-family="${MONO}" font-size="12" fill="${T.faint}">@${login} · updated ${new Date().toISOString().slice(0, 10)}</text>
  ${figSvg}
  <path d="M${PAD} 190.5H${W - PAD}" stroke="${T.faint}" stroke-opacity=".6"/>
  <text x="${PAD}" y="${top - 2}" font-size="13" fill="${T.muted}">Last 12 months</text>
  <text x="${W - PAD}" y="${top - 2}" text-anchor="end" font-size="13" fill="${T.muted}">Best day <tspan fill="${T.text}" font-weight="700">${s.best.count}</tspan> · ${fmtDate(s.best.date)}</text>
  <g transform="translate(0,26)">${bars}</g>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${T.border}" stroke-opacity=".28"/>
</svg>
`;
}

const days = demo ? demoDays() : await fetchDays();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, render(compute(days)));
console.log('wrote', outFile);
