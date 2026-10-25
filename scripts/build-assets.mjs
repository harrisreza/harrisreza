// Builds every static SVG in assets/ from scripts/theme.mjs.
// Usage: node scripts/build-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, FONT, MONO } from './theme.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'assets');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'stack'), { recursive: true });
const write = (name, svg) => fs.writeFileSync(path.join(OUT, name), svg);

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inner = file => fs.readFileSync(file, 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  .replace(/<title>[\s\S]*?<\/title>/, '').trim();
// Simple Icons: filled 24×24 glyph. Lucide: stroked 24×24 glyph.
const brand = (n, x, y, size, color = T.accent) =>
  `<g transform="translate(${x},${y}) scale(${size / 24})" fill="${color}">${inner(path.join(here, 'icons/brand', n + '.svg'))}</g>`;
const ui = (n, x, y, size, color = T.accent, sw = 2) =>
  `<g transform="translate(${x},${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner(path.join(here, 'icons/ui', n + '.svg'))}</g>`;

let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Shared frame: rounded panel with a faint green hairline, same on every big asset.
const frameDefs = (W, H) => `<clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>`;
const frameBorder = (W, H) => `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${T.border}" stroke-opacity=".28"/>`;

// Contribution-style square grid, a few cells breathing.
function cells(W, H, { step = 18, size = 13, density = .32, animated = 50 } = {}) {
  let s = '';
  const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = rnd();
    const lvl = v > density ? 0 : 1 + Math.floor(rnd() * 4);
    const fill = T.levels[lvl];
    const anim = lvl > 0 && rnd() < animated / (cols * rows * density)
      ? `<animate attributeName="fill" values="${fill};${T.levels[4]};${fill}" dur="${(2 + rnd() * 4).toFixed(1)}s" begin="${(rnd() * 5).toFixed(1)}s" repeatCount="indefinite"/>` : '';
    s += `<rect x="${c * step}" y="${r * step}" width="${size}" height="${size}" rx="3" fill="${fill}">${anim}</rect>`;
  }
  return s;
}

// ───────────────────────── HEADER ─────────────────────────
{
  const W = 1200, H = 380, CX = 960, CY = 190;
  const orbit = (names, r, dur, dir) => {
    const items = names.map((n, i) => {
      const a = (i / names.length) * Math.PI * 2 - Math.PI / 2;
      const x = (CX + r * Math.cos(a)).toFixed(1), y = (CY + r * Math.sin(a)).toFixed(1);
      return `<g transform="translate(${x},${y})"><g>
        <animateTransform attributeName="transform" type="rotate" from="0" to="${-dir * 360}" dur="${dur}s" repeatCount="indefinite"/>
        <circle r="24" fill="${T.bg}" stroke="${T.accent}" stroke-opacity=".45" stroke-width="1.5"/>
        ${brand(n, -12, -12, 24)}
      </g></g>`;
    }).join('\n');
    return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${T.accent}" stroke-opacity=".22" stroke-dasharray="2 8"/>
    <g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="${dir * 360} ${CX} ${CY}" dur="${dur}s" repeatCount="indefinite"/>${items}</g>`;
  };
  const pill = (x, w, icon, txt) => `<g transform="translate(${x},304)">
    <rect width="${w}" height="34" rx="17" fill="${T.panel2}" stroke="${T.accent}" stroke-opacity=".35"/>
    ${ui(icon, 14, 9, 16)}
    <text x="38" y="22" font-size="14" font-weight="600" fill="${T.text}">${txt}</text></g>`;

  write('header.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  ${frameDefs(W, H)}
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="10"/></filter>
  <linearGradient id="gridFade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>
  <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#gridFade)"/></mask>
  <linearGradient id="name" x1="0" x2="1" spreadMethod="repeat">
    <stop offset="0" stop-color="${T.text}"/><stop offset=".45" stop-color="${T.text}"/><stop offset=".6" stop-color="${T.accentSoft}"/><stop offset=".75" stop-color="${T.text}"/><stop offset="1" stop-color="${T.text}"/>
    <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0" dur="5s" repeatCount="indefinite"/>
  </linearGradient>
  <radialGradient id="core"><stop offset="0" stop-color="${T.accentSoft}"/><stop offset="1" stop-color="${T.accentDeep}"/></radialGradient>
  <linearGradient id="edge" x1="0" x2="1"><stop offset="0" stop-color="${T.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${T.accent}"/><stop offset="1" stop-color="${T.accent}" stop-opacity="0"/></linearGradient>
</defs>
<g clip-path="url(#frame)" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="${T.bg}"/>
  <g mask="url(#gridMask)">${cells(W, H)}</g>
  <g filter="url(#blur)">
    <circle cx="${CX}" cy="${CY}" r="150" fill="${T.accentDeep}" opacity=".45"><animate attributeName="r" values="130;170;130" dur="8s" repeatCount="indefinite"/></circle>
    <circle cx="120" cy="40" r="140" fill="${T.levels[2]}" opacity=".35"><animate attributeName="cx" values="80;260;80" dur="16s" repeatCount="indefinite"/></circle>
  </g>
  <rect width="680" height="${H}" fill="${T.bg}" opacity=".55" filter="url(#blur)"/>

  <g transform="translate(70,72)">
    <rect width="214" height="32" rx="16" fill="${T.panel2}" stroke="${T.accent}" stroke-opacity=".45"/>
    <circle cx="20" cy="16" r="4.5" fill="${T.accent}"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></circle>
    <circle cx="20" cy="16" r="4.5" fill="none" stroke="${T.accent}"><animate attributeName="r" values="4.5;11" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="1.6s" repeatCount="indefinite"/></circle>
    <text x="36" y="21" font-family="${MONO}" font-size="13" fill="${T.accentSoft}">open to collaborate</text>
  </g>
  <text x="72" y="152" font-size="22" fill="${T.muted}">Hi there, I'm</text>
  <text x="68" y="216" font-size="56" font-weight="800" letter-spacing="-1.2" fill="url(#name)">Mochamad Harris Reza</text>
  <text x="72" y="266" font-family="${MONO}" font-size="21" fill="${T.text}"><tspan fill="${T.accent}">~/</tspan> Full Stack Software Engineer</text>
  <rect x="440" y="248" width="10" height="23" fill="${T.accent}"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" calcMode="discrete"/></rect>

  ${pill(70, 206, 'map-pin', 'Surabaya, Indonesia')}
  ${pill(288, 132, 'zap', '5+ years')}
  ${pill(432, 160, 'rocket', '20+ projects')}

  ${orbit(['flutter', 'postgresql', 'nodedotjs', 'typescript', 'docker', 'tailwindcss', 'php', 'dart'], 150, 50, -1)}
  ${orbit(['react', 'nextdotjs', 'laravel', 'go'], 88, 30, 1)}
  <circle cx="${CX}" cy="${CY}" r="42" fill="${T.accent}" opacity=".35" filter="url(#soft)"><animate attributeName="r" values="38;52;38" dur="3s" repeatCount="indefinite"/></circle>
  <circle cx="${CX}" cy="${CY}" r="38" fill="url(#core)"/>
  <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-family="${MONO}" font-size="27" font-weight="700" fill="${T.bg}">&lt;/&gt;</text>
  <rect x="0" y="${H - 2}" width="${W}" height="2" fill="url(#edge)"/>
</g>
${frameBorder(W, H)}
</svg>
`);
}

// ───────────────────────── SOCIAL PILLS ─────────────────────────
for (const [file, icon, isUi, label] of [
  ['web', 'globe', true, 'harris.web.id'],
  ['linkedin', 'linkedin', false, 'LinkedIn'],
  ['instagram', 'instagram', false, 'Instagram'],
]) {
  const w = 56 + label.length * 8.6;
  write(`social-${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="40" viewBox="0 0 ${w} 40">
<rect x=".5" y=".5" width="${w - 1}" height="39" rx="20" fill="${T.panel}" stroke="${T.accent}" stroke-opacity=".4"/>
${isUi ? ui(icon, 16, 11, 18) : brand(icon, 16, 11, 18)}
<text x="44" y="25" font-family="${FONT}" font-size="14" font-weight="600" fill="${T.text}">${esc(label)}</text>
</svg>
`);
}

// ───────────────────────── SECTION TITLES ─────────────────────────
// Self-contained dark banner so the title stays readable in GitHub light mode too.
for (const [file, num, title] of [
  ['stack', '01', 'Tech Stack'], ['projects', '02', 'Featured Projects'],
  ['stats', '03', 'GitHub Stats'], ['arcade', '04', 'Contribution Arcade'],
]) {
  const W = 1200, H = 64, lineX = 118 + title.length * 13.5 + 24;
  write(`title-${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${frameDefs(W, H)}<linearGradient id="l" x1="0" x2="1"><stop offset="0" stop-color="${T.accent}" stop-opacity=".6"/><stop offset="1" stop-color="${T.accent}" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${T.panel}"/>
  ${[0, 1, 2, 3].map(i => `<rect x="${24 + i * 11}" y="28" width="8" height="8" rx="2" fill="${T.levels[i + 1]}"/>`).join('')}
  <text x="80" y="41" font-family="${MONO}" font-size="14" fill="${T.accent}" letter-spacing="1">${num}</text>
  <text x="118" y="42" font-family="${FONT}" font-size="23" font-weight="700" fill="${T.text}">${title}</text>
  <rect x="${lineX}" y="31.5" width="${W - lineX - 28}" height="1" fill="url(#l)"/>
  <rect y="29" width="6" height="6" rx="1.5" fill="${T.accent}"><animate attributeName="x" values="${lineX};${W - 28}" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="5s" repeatCount="indefinite"/></rect>
</g>
${frameBorder(W, H)}
</svg>
`);
}

// ───────────────────────── PROJECT CARDS ─────────────────────────
const tagRow = (tags, x0, y) => {
  let x = x0;
  return tags.map(t => {
    const w = t.length * 7.4 + 22;
    const s = `<g transform="translate(${x},${y})"><rect width="${w}" height="24" rx="6" fill="${T.levels[1]}" fill-opacity=".6" stroke="${T.accent}" stroke-opacity=".3"/><text x="${w / 2}" y="16.5" text-anchor="middle" font-family="${MONO}" font-size="11.5" fill="${T.accentSoft}">${esc(t)}</text></g>`;
    x += w + 8;
    return s;
  }).join('');
};
const live = (x, y) => `<g transform="translate(${x},${y})">
  <circle r="4" fill="${T.accent}"><animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></circle>
  <circle r="4" fill="none" stroke="${T.accent}"><animate attributeName="r" values="4;11" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="1.4s" repeatCount="indefinite"/></circle>
  <text x="12" y="4" font-family="${MONO}" font-size="11" font-weight="700" letter-spacing="1.5" fill="${T.accent}">LIVE</text></g>`;

// The project's real site logo (scripts/icons/projects), nested as its own <svg>.
const logo = (n, x, y, size) => fs.readFileSync(path.join(here, 'icons/projects', n + '.svg'), 'utf8')
  .trim().replace(/<svg\b/, `<svg x="${x}" y="${y}" width="${size}" height="${size}"`).replace(/\s(width|height)="32"(?=[^<]*viewBox|\s*>)/g, '');

function card({ file, title, host, desc, tags, W = 590, extra = '' }) {
  const H = 230;
  write(`card-${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>
  ${frameDefs(W, H)}
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${T.panel}"/>
  <rect x="28" y="28" width="64" height="64" rx="18" fill="none" stroke="${T.accent}" stroke-opacity=".35"/>
  ${logo(file, 32, 32, 56)}
  <text x="104" y="56" font-size="24" font-weight="800" fill="${T.text}">${esc(title)}</text>
  <text x="104" y="78" font-family="${MONO}" font-size="12.5" fill="${T.muted}">${esc(host)}</text>
  ${live(W - 74, 50)}
  <text x="32" y="128" font-size="14.5" fill="${T.text}" fill-opacity=".85">${esc(desc[0])}</text>
  <text x="32" y="150" font-size="14.5" fill="${T.text}" fill-opacity=".85">${esc(desc[1])}</text>
  ${tagRow(tags, 32, 178)}
  ${ui('arrow-up-right', W - 56, 178, 24)}
  ${extra}
</g>
${frameBorder(W, H)}
</svg>
`);
}

// Wide portfolio card gets a mini browser mock on the right.
const browser = (() => {
  const x = 680, y = 30, w = 390, h = 170;
  const bars = [[24, 40, 220], [24, 64, 300], [24, 88, 260]];
  const sq = Array.from({ length: 4 * 18 }, (_, i) => {
    const c = i % 18, r = Math.floor(i / 18);
    const lvl = rnd() < .4 ? 1 + Math.floor(rnd() * 4) : 0;
    return `<rect x="${24 + c * 19}" y="${110 + r * 13}" width="15" height="10" rx="2" fill="${T.levels[lvl]}"/>`;
  }).join('');
  return `<g transform="translate(${x},${y})">
    <rect width="${w}" height="${h}" rx="12" fill="${T.bg}" stroke="${T.accent}" stroke-opacity=".3"/>
    <path d="M0 28.5H${w}" stroke="${T.accent}" stroke-opacity=".2"/>
    ${[2, 3, 4].map((l, i) => `<rect x="${14 + i * 14}" y="10" width="8" height="8" rx="2" fill="${T.levels[l]}"/>`).join('')}
    <rect x="70" y="7" width="${w - 90}" height="14" rx="7" fill="${T.panel2}"/>
    <text x="84" y="18" font-family="${MONO}" font-size="10" fill="${T.muted}">https://harris.web.id</text>
    ${bars.map(([bx, by, bw], i) => `<rect x="${bx}" y="${by}" width="${bw}" height="10" rx="5" fill="${i ? T.levels[1] : T.accentDeep}"><animate attributeName="width" values="${bw};${bw * .7};${bw}" dur="${3 + i}s" repeatCount="indefinite"/></rect>`).join('')}
    ${sq}
  </g>`;
})();

card({ file: 'portfolio', title: 'harris.web.id', host: '↗ harris.web.id', W: 1200,
  desc: ['Personal portfolio, blog, guestbook & mini-games —', 'with its own Harris AI chatbot.'], tags: ['Next.js', 'Prisma', 'PostgreSQL'], extra: browser });
card({ file: 'wedding', title: 'WeddingOS', host: '↗ harris-wedding-os.vercel.app',
  desc: ['Wedding planner: budget, guests, WhatsApp invites,', 'live RSVP, seating & QR check-in + AI assistant.'], tags: ['Next.js', 'Realtime', 'AI'] });
card({ file: 'learnplay', title: 'LearnPlay', host: '↗ harris-learnplay.vercel.app',
  desc: ['Gamified LMS: courses, XP & streaks, CBT / CPNS', 'tryouts, QR live quiz & verifiable certificates.'], tags: ['Next.js', 'Gamification', 'AI Tutor'] });
card({ file: 'hris', title: 'HRIS', host: '↗ harris-hris.vercel.app',
  desc: ['Face attendance with liveness & geofence, leave &', 'overtime approvals, payroll with BPJS / PPh 21.'], tags: ['Next.js', 'Supabase', 'RLS'] });
card({ file: 'pos', title: 'Kasir Cepat POS', host: '↗ harris-pos.vercel.app',
  desc: ['Online/offline POS & back office for multi-branch', 'stores: barcode, QRIS, Bluetooth printing.'], tags: ['Flutter', 'Next.js', 'QRIS'] });

// ───────────────────────── TECH STACK TILES ─────────────────────────
// Logos keep their original brand colors (devicon, as on harris.web.id).
// The few whose originals are too dark for the panel use a Simple Icons glyph instead.
const devicon = (n, x, y, size) => fs.readFileSync(path.join(here, 'icons/devicon', n + '.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '').trim()
  .replace(/<svg\b[^>]*?(viewBox="[^"]*")[^>]*>/, `<svg x="${x}" y="${y}" width="${size}" height="${size}" $1>`);
const STACK = [
  ['html5', 'HTML'], ['css3', 'CSS'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['react', 'React'],
  ['nextjs', 'Next.js'], ['vuejs', 'Vue'], ['tailwindcss', 'Tailwind'], ['sass', 'Sass'],
  ['nodejs', 'Node.js'], ['php', 'PHP'], ['laravel', 'Laravel'], ['codeigniter', 'CodeIgniter'], ['go', 'Go'],
  ['python', 'Python'], ['prisma', 'Prisma', '#ffffff'], ['wordpress', 'WordPress', '#3b9fd8'], ['flutter', 'Flutter'],
  ['dart', 'Dart'], ['postgresql', 'PostgreSQL'], ['mysql', 'MySQL'], ['mongodb', 'MongoDB'], ['firebase', 'Firebase'],
  ['docker', 'Docker'], ['amazonwebservices', 'AWS', '#ff9900'], ['vercel', 'Vercel', '#ffffff'], ['git', 'Git'],
];
for (const [n, label, glyph] of STACK) {
  write(`stack/${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="104" height="104" viewBox="0 0 104 104">
<rect x=".5" y=".5" width="103" height="103" rx="18" fill="${T.panel}" stroke="${T.accent}" stroke-opacity=".28"/>
${glyph ? brand(n, 33, 19, 38, glyph) : devicon(n, 30, 15, 44)}
<text x="52" y="85" text-anchor="middle" font-family="${MONO}" font-size="${label.length > 9 ? 10 : 11.5}" fill="${T.muted}">${label}</text>
</svg>
`);
}

// ───────────────────────── FOOTER ─────────────────────────
{
  const W = 1200, H = 150;
  write('footer.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${frameDefs(W, H)}
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
  <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${T.bg}"/>
  <g mask="url(#m)">${cells(W, H, { density: .45, animated: 80 })}</g>
  <rect y="${H - 54}" width="${W}" height="54" fill="${T.bg}" opacity=".7"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${T.text}">thanks for stopping by <tspan fill="${T.accent}">·</tspan> harris.web.id <tspan fill="${T.accent}">·</tspan> built in Surabaya</text>
</g>
${frameBorder(W, H)}
</svg>
`);
}

console.log('assets built →', OUT);
