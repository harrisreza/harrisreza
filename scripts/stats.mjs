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
  const W = 1200, H = 330;
  const tiles = [
    { label: 'TOTAL CONTRIBUTIONS', value: fmt(s.total), sub: `since ${fmtDate(s.since)}`, c: T.accent, icon: '◆' },
    { label: `IN ${s.year}`, value: fmt(s.thisYear), sub: 'contributions this year', c: T.accent, icon: '▲' },
    { label: 'CURRENT STREAK', value: `${s.current}`, sub: s.current === 1 ? 'day' : 'days', c: T.accent, icon: '●', flame: true },
    { label: 'LONGEST STREAK', value: `${s.longest}`, sub: s.longest === 1 ? 'day' : 'days', c: T.accent, icon: '★' },
  ];
  const tileSvg = tiles.map((t, i) => {
    const x = 32 + (i % 2) * 262, y = 32 + Math.floor(i / 2) * 136;
    return `<g transform="translate(${x},${y})">
    <rect width="246" height="120" rx="16" fill="${T.panel}" stroke="${t.c}" stroke-opacity=".3"/>
    <rect width="246" height="120" rx="16" fill="url(#tileGlow${i})"/>
    <text x="20" y="32" font-family="${MONO}" font-size="11.5" letter-spacing="1.5" fill="${t.c}">${t.icon} ${t.label}</text>
    <text x="20" y="80" font-size="40" font-weight="800" fill="${T.text}">${t.value}</text>
    <text x="20" y="104" font-size="13" fill="${T.muted}">${t.sub}</text>
    ${t.flame ? `<circle cx="214" cy="30" r="5" fill="${t.c}"><animate attributeName="r" values="4;7;4" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></circle>` : ''}
  </g>`;
  }).join('\n');

  // Monthly bar chart
  const cx = 572, cy = 32, cw = 596, ch = 256;
  const max = Math.max(1, ...s.months.map(m => m.count));
  const plotTop = cy + 84, plotH = ch - 132, baseY = plotTop + plotH;
  const bw = (cw - 48) / 12;
  const bars = s.months.map((m, i) => {
    const h = Math.max(3, (m.count / max) * plotH);
    const x = cx + 24 + i * bw + bw * 0.18, w = bw * 0.64;
    const last = i === 11;
    return `<rect x="${x.toFixed(1)}" y="${(baseY - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${T.levels[Math.max(1, Math.ceil((m.count / max) * 4))]}">${last ? '<animate attributeName="fill-opacity" values="1;.55;1" dur="1.6s" repeatCount="indefinite"/>' : ''}</rect>
    <text x="${(x + w / 2).toFixed(1)}" y="${baseY + 20}" text-anchor="middle" font-size="11" fill="${last ? T.text : T.faint}">${m.label}</text>
    ${m.count ? `<text x="${(x + w / 2).toFixed(1)}" y="${(baseY - h - 6).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="10" fill="${T.muted}">${m.count}</text>` : ''}`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  <clipPath id="chart"><rect x="572" y="32" width="596" height="256" rx="16"/></clipPath>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
  ${tiles.map((t, i) => `<radialGradient id="tileGlow${i}" cx="1" cy="0" r="1"><stop offset="0" stop-color="${t.c}" stop-opacity=".12"/><stop offset="1" stop-color="${t.c}" stop-opacity="0"/></radialGradient>`).join('')}
  <linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${T.bg}"/>
  <g filter="url(#blur)" opacity=".3">
    <circle cx="1000" cy="40" r="170" fill="${T.accentDeep}"><animate attributeName="cy" values="20;110;20" dur="12s" repeatCount="indefinite"/></circle>
  </g>
  ${tileSvg}
  <g>
    <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="16" fill="${T.panel}" stroke="${T.accent}" stroke-opacity=".3"/>
    <text x="${cx + 24}" y="${cy + 32}" font-family="${MONO}" font-size="11.5" letter-spacing="1.5" fill="${T.accent}">▮ LAST 12 MONTHS</text>
    <text x="${cx + 24}" y="${cy + 56}" font-size="13" fill="${T.muted}">Best day: <tspan fill="${T.text}" font-weight="700">${s.best.count}</tspan> contributions · ${fmtDate(s.best.date)}</text>
    <path d="M${cx + 24} ${baseY + .5} H${cx + cw - 24}" stroke="${T.levels[0]}"/>
    ${bars}
    <rect x="${cx - 200}" y="${cy}" width="200" height="${ch}" fill="url(#scan)" clip-path="url(#chart)"><animate attributeName="x" values="${cx - 200};${cx + cw}" dur="5s" repeatCount="indefinite"/></rect>
  </g>
  <text x="${W - 32}" y="${H - 14}" text-anchor="end" font-family="${MONO}" font-size="10.5" fill="${T.faint}">updated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · @${login}</text>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${T.border}" stroke-opacity=".28"/>
</svg>
`;
}

const days = demo ? demoDays() : await fetchDays();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, render(compute(days)));
console.log('wrote', outFile);
