import sharp from 'sharp';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'public');

const GOLD       = '#B3985B';
const GOLD_HI    = '#F0DC9A';
const GOLD_MID   = '#C9AD70';
const GOLD_DRK   = '#7A6030';
const GOLD_DEEP  = '#3A2A0C';

const W = 2400, H = 400;
const BG = '#080808';

// ─── Shared spec gradient ─────────────────────────────────────────────────────
// (used inline per sphere)

// ── PROPUESTA A — Clásico Elevado ─────────────────────────────────────────────
// Same composition as original. Pearl + Gold spheres, 3D shading, refined type.
const svgA = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <!-- Pearl sphere -->
  <radialGradient id="pearl" cx="36%" cy="28%" r="64%" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#FFFFFF"/>
    <stop offset="18%"  stop-color="#DDDBD8"/>
    <stop offset="62%"  stop-color="#9A9A9A"/>
    <stop offset="100%" stop-color="#4A4A4A"/>
  </radialGradient>
  <!-- Gold sphere -->
  <radialGradient id="gold" cx="33%" cy="26%" r="67%" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="${GOLD_HI}"/>
    <stop offset="22%"  stop-color="${GOLD}"/>
    <stop offset="65%"  stop-color="${GOLD_DRK}"/>
    <stop offset="100%" stop-color="${GOLD_DEEP}"/>
  </radialGradient>
  <!-- Specular highlight -->
  <radialGradient id="spec" cx="38%" cy="30%" r="38%">
    <stop offset="0%"   stop-color="rgba(255,255,255,0.72)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
  </radialGradient>
  <!-- Drop shadow filter -->
  <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="rgba(0,0,0,0.5)"/>
  </filter>
</defs>

<!-- Background -->
<rect width="${W}" height="${H}" fill="${BG}"/>

<!-- Pearl sphere -->
<circle cx="144" cy="152" r="87" fill="url(#pearl)" filter="url(#drop)"/>
<ellipse cx="126" cy="124" rx="34" ry="23" fill="url(#spec)" opacity="0.85"/>

<!-- Gold sphere -->
<circle cx="198" cy="246" r="106" fill="url(#gold)" filter="url(#drop)"/>
<ellipse cx="177" cy="213" rx="40" ry="27" fill="url(#spec)" opacity="0.58"/>

<!-- MAINSTAGE — light weight, fills width -->
<text x="338" y="278"
  textLength="2034" lengthAdjust="spacing"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="300"
  font-size="234"
  fill="#FFFFFF">MAINSTAGE</text>

<!-- Gold separator line -->
<line x1="338" y1="314" x2="2376" y2="314" stroke="${GOLD}" stroke-width="1.6"/>

<!-- PRO -->
<text x="2376" y="376"
  text-anchor="end"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="500"
  font-size="54"
  letter-spacing="16"
  fill="${GOLD}">PRO</text>
</svg>`;

// ── PROPUESTA B — Línea de Lujo ───────────────────────────────────────────────
// Ultra-thin typography. Pearl sphere larger/dominant top, gold peeking behind.
// Double thin gold lines. Subtitle "PRO" becomes a centered label.
const svgB = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="pearlB" cx="38%" cy="30%" r="62%" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#FFFFFF"/>
    <stop offset="16%"  stop-color="#ECEAE7"/>
    <stop offset="58%"  stop-color="#B2B0AE"/>
    <stop offset="100%" stop-color="#5A5A5A"/>
  </radialGradient>
  <radialGradient id="goldB" cx="32%" cy="25%" r="70%" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#F8E5A5"/>
    <stop offset="16%"  stop-color="${GOLD}"/>
    <stop offset="58%"  stop-color="#8C7035"/>
    <stop offset="100%" stop-color="#3E2A0A"/>
  </radialGradient>
  <radialGradient id="specB" cx="40%" cy="30%" r="34%">
    <stop offset="0%"   stop-color="rgba(255,255,255,0.78)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
  </radialGradient>
  <filter id="dropB" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="2" dy="10" stdDeviation="16" flood-color="rgba(0,0,0,0.52)"/>
  </filter>
</defs>

<rect width="${W}" height="${H}" fill="${BG}"/>

<!-- Pearl sphere — dominant, upper -->
<circle cx="152" cy="144" r="104" fill="url(#pearlB)" filter="url(#dropB)"/>
<ellipse cx="130" cy="110" rx="42" ry="28" fill="url(#specB)" opacity="0.88"/>
<ellipse cx="182" cy="128" rx="14" ry="9" fill="rgba(255,255,255,0.35)"/>

<!-- Gold sphere — slightly smaller, behind/lower -->
<circle cx="212" cy="262" r="90" fill="url(#goldB)" filter="url(#dropB)"/>
<ellipse cx="192" cy="233" rx="34" ry="22" fill="url(#specB)" opacity="0.62"/>

<!-- MAINSTAGE — ultra-thin, open tracking -->
<text x="358" y="272"
  textLength="2014" lengthAdjust="spacing"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="100"
  font-size="224"
  fill="#FFFFFF">MAINSTAGE</text>

<!-- Double thin gold lines -->
<line x1="358" y1="306" x2="2376" y2="306" stroke="${GOLD}" stroke-width="0.9"/>
<line x1="358" y1="312" x2="2376" y2="312" stroke="${GOLD}" stroke-width="0.9"/>

<!-- PRO — left-aligned, spaced -->
<text x="358" y="376"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="400"
  font-size="44"
  letter-spacing="26"
  fill="${GOLD}">PRODUCCIÓN  TÉCNICA  PROFESIONAL</text>
</svg>`;

// ── PROPUESTA C — Esfera Dorada ───────────────────────────────────────────────
// One large dominant gold sphere. Pearl becomes small accent overlapping top-right.
// Typography: semi-bold, tighter. PRO as bold accent. More power/impact.
const svgC = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="goldC" cx="31%" cy="25%" r="72%" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#FBE9AC"/>
    <stop offset="14%"  stop-color="${GOLD_MID}"/>
    <stop offset="40%"  stop-color="${GOLD}"/>
    <stop offset="72%"  stop-color="${GOLD_DRK}"/>
    <stop offset="100%" stop-color="${GOLD_DEEP}"/>
  </radialGradient>
  <!-- Rim light — warm glow at bottom-right edge -->
  <radialGradient id="rim" cx="68%" cy="72%" r="48%">
    <stop offset="0%"   stop-color="rgba(179,152,91,0.28)"/>
    <stop offset="100%" stop-color="rgba(179,152,91,0)"/>
  </radialGradient>
  <radialGradient id="pearlC" cx="40%" cy="32%" r="58%">
    <stop offset="0%"   stop-color="rgba(255,255,255,0.95)"/>
    <stop offset="38%"  stop-color="rgba(210,208,206,0.75)"/>
    <stop offset="100%" stop-color="rgba(110,110,110,0.4)"/>
  </radialGradient>
  <radialGradient id="glintC" cx="34%" cy="26%" r="34%">
    <stop offset="0%"   stop-color="rgba(255,255,255,0.82)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
  </radialGradient>
  <filter id="dropC" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="4" dy="14" stdDeviation="20" flood-color="rgba(0,0,0,0.58)"/>
  </filter>
  <filter id="dropCsm" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="2" dy="6" stdDeviation="10" flood-color="rgba(0,0,0,0.4)"/>
  </filter>
</defs>

<rect width="${W}" height="${H}" fill="${BG}"/>

<!-- Large gold sphere -->
<circle cx="192" cy="200" r="172" fill="url(#goldC)" filter="url(#dropC)"/>
<circle cx="192" cy="200" r="172" fill="url(#rim)"/>
<!-- Primary glint -->
<ellipse cx="155" cy="148" rx="56" ry="38" fill="url(#glintC)"/>
<!-- Secondary micro-glint -->
<ellipse cx="232" cy="128" rx="20" ry="13" fill="rgba(255,255,255,0.28)"/>

<!-- Small pearl sphere — top-right accent -->
<circle cx="296" cy="72" r="50" fill="url(#pearlC)" filter="url(#dropCsm)"/>
<ellipse cx="282" cy="57" rx="18" ry="12" fill="rgba(255,255,255,0.75)"/>

<!-- MAINSTAGE — medium-bold -->
<text x="400" y="268"
  textLength="1960" lengthAdjust="spacing"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="500"
  font-size="218"
  fill="#FFFFFF">MAINSTAGE</text>

<!-- Gold line -->
<line x1="400" y1="300" x2="2378" y2="300" stroke="${GOLD}" stroke-width="1.8"/>

<!-- PRO — bold, right side -->
<text x="2378" y="368"
  text-anchor="end"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="700"
  font-size="58"
  letter-spacing="14"
  fill="${GOLD}">PRO</text>

<!-- Small label left side -->
<text x="400" y="368"
  font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
  font-weight="300"
  font-size="32"
  letter-spacing="8"
  fill="rgba(179,152,91,0.55)">PRODUCCIÓN  TÉCNICA</text>
</svg>`;

// ── Generate PNGs ─────────────────────────────────────────────────────────────
const logos = [
  { file: 'logo-propuesta-a.png', svg: svgA, label: 'A — Clásico Elevado' },
  { file: 'logo-propuesta-b.png', svg: svgB, label: 'B — Línea de Lujo'  },
  { file: 'logo-propuesta-c.png', svg: svgC, label: 'C — Esfera Dorada'  },
];

for (const logo of logos) {
  await sharp(Buffer.from(logo.svg))
    .png({ quality: 100 })
    .toFile(path.join(OUT, logo.file));
  console.log(`✓ ${logo.label} → public/${logo.file}`);
}

console.log('\nListo. Archivos en /public/');
