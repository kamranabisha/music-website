/*
 * Album artwork generator for Task 3 — Music Player
 * Writes 10 abstract 600×600 SVG covers into ../art.
 * Run with:  node tools/generate-art.js
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "art");

const COVERS = [
  { file: "midnight-mirage.svg", a: "#7C5CFF", b: "#FF4D8D", c: "#12121C", motif: "rings" },
  { file: "electric-bloom.svg", a: "#FF7A59", b: "#FFD166", c: "#181020", motif: "petals" },
  { file: "asphalt-thunder.svg", a: "#E63946", b: "#FF9F1C", c: "#140F12", motif: "lightning" },
  { file: "broken-compass.svg", a: "#F72585", b: "#4CC9F0", c: "#100D16", motif: "grid" },
  { file: "concrete-dreams.svg", a: "#B892FF", b: "#48CAE4", c: "#0D0D15", motif: "bars" },
  { file: "velvet-flow.svg", a: "#9D4EDD", b: "#FFB703", c: "#12101A", motif: "waves" },
  { file: "rain-on-glass.svg", a: "#48BFE3", b: "#5E60CE", c: "#0B1016", motif: "drops" },
  { file: "slow-orbit.svg", a: "#06D6A0", b: "#118AB2", c: "#0A1214", motif: "orbit" },
  { file: "nocturne-in-amber.svg", a: "#FFB703", b: "#E07A5F", c: "#14100C", motif: "keys" },
  { file: "glass-aria.svg", a: "#80FFDB", b: "#7B2CBF", c: "#0C1013", motif: "strings" },
];

function motifMarkup(kind, accent, accent2) {
  switch (kind) {
    case "rings":
      return [0, 1, 2, 3, 4]
        .map(
          (i) =>
            `<circle cx="300" cy="300" r="${80 + i * 44}" fill="none" stroke="${i % 2 ? accent2 : accent}" stroke-width="${10 - i}" opacity="${0.55 - i * 0.08}"/>`
        )
        .join("\n    ");
    case "petals":
      return [0, 60, 120, 180, 240, 300]
        .map(
          (deg) =>
            `<ellipse cx="300" cy="200" rx="52" ry="120" fill="${accent}" opacity="0.32" transform="rotate(${deg} 300 300)"/>`
        )
        .join("\n    ");
    case "lightning":
      return `<path d="M330 70 L210 300 L295 300 L250 530 L400 275 L310 275 Z" fill="${accent}" opacity="0.5"/>
    <path d="M330 70 L210 300 L295 300 L250 530 L400 275 L310 275 Z" fill="none" stroke="${accent2}" stroke-width="6" opacity="0.85"/>`;
    case "grid":
      return Array.from({ length: 7 }, (_, i) => 90 + i * 70)
        .map(
          (p) =>
            `<line x1="${p}" y1="70" x2="${p}" y2="530" stroke="${accent}" stroke-width="2" opacity="0.35"/>
    <line x1="70" y1="${p}" x2="530" y2="${p}" stroke="${accent2}" stroke-width="2" opacity="0.28"/>`
        )
        .join("\n    ") +
        `\n    <circle cx="300" cy="300" r="86" fill="${accent}" opacity="0.45"/>`;
    case "bars":
      return [140, 90, 210, 160, 260, 120, 190]
        .map((h, i) => {
          const x = 120 + i * 62;
          return `<rect x="${x}" y="${300 - h / 2}" width="30" height="${h}" rx="15" fill="${i % 2 ? accent2 : accent}" opacity="0.6"/>`;
        })
        .join("\n    ");
    case "waves":
      return [0, 1, 2, 3]
        .map(
          (i) =>
            `<path d="M40 ${230 + i * 55} Q 170 ${150 + i * 55} 300 ${230 + i * 55} T 560 ${230 + i * 55}" fill="none" stroke="${i % 2 ? accent2 : accent}" stroke-width="7" opacity="${0.65 - i * 0.12}" stroke-linecap="round"/>`
        )
        .join("\n    ");
    case "drops":
      return Array.from({ length: 26 }, (_, i) => {
        const x = 70 + ((i * 137) % 470);
        const y = 70 + ((i * 91) % 470);
        const r = 5 + ((i * 7) % 16);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 3 ? accent : accent2}" opacity="0.5"/>`;
      }).join("\n    ");
    case "orbit":
      return `<ellipse cx="300" cy="300" rx="230" ry="120" fill="none" stroke="${accent}" stroke-width="6" opacity="0.7" transform="rotate(-22 300 300)"/>
    <ellipse cx="300" cy="300" rx="170" ry="230" fill="none" stroke="${accent2}" stroke-width="5" opacity="0.55" transform="rotate(18 300 300)"/>
    <circle cx="300" cy="300" r="66" fill="${accent}" opacity="0.85"/>
    <circle cx="474" cy="216" r="24" fill="#ffffff" opacity="0.85"/>`;
    case "keys":
      return Array.from({ length: 9 }, (_, i) => {
        const x = 96 + i * 46;
        return `<rect x="${x}" y="170" width="38" height="260" rx="8" fill="#ffffff" opacity="${i % 3 === 1 ? 0.14 : 0.3}"/>`;
      }).join("\n    ") +
        `\n    <rect x="140" y="170" width="320" height="8" fill="${accent}" opacity="0.9"/>`;
    case "strings":
      return Array.from({ length: 8 }, (_, i) => {
        const x = 120 + i * 52;
        const bend = (i % 3) * 14 - 14;
        return `<path d="M${x} 80 Q ${x + bend} 300 ${x} 520" stroke="${i % 2 ? accent2 : accent}" stroke-width="5" fill="none" opacity="0.7"/>`;
      }).join("\n    ");
    default:
      return "";
  }
}

function coverSvg(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="Album artwork">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c.c}"/>
      <stop offset="55%" stop-color="${c.c}"/>
      <stop offset="100%" stop-color="${c.a}" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="glowA" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c.a}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${c.a}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c.b}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${c.b}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="42%" r="68%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>

  <rect width="600" height="600" fill="url(#base)"/>
  <g filter="url(#soft)">
    <ellipse cx="170" cy="150" rx="180" ry="160" fill="url(#glowA)"/>
    <ellipse cx="450" cy="450" rx="200" ry="170" fill="url(#glowB)"/>
  </g>

  <g>
    ${motifMarkup(c.motif, c.a, c.b)}
  </g>

  <rect width="600" height="600" fill="url(#vig)"/>
  <rect width="600" height="600" filter="url(#grain)" opacity="0.07"/>
  <rect x="6" y="6" width="588" height="588" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" rx="4"/>
</svg>
`;
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
for (const c of COVERS) {
  fs.writeFileSync(path.join(OUT_DIR, c.file), coverSvg(c));
  console.log("wrote", c.file);
}
console.log("Done.");
