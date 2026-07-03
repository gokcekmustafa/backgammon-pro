# Script to generate PWA icons (fallback if SVGs aren't accepted)
# Run: node scripts/generate-icons.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// SVG icons for PWA — these work as valid PWA icons
const icons = [
  { name: 'icon-192x192.png', size: 192, color: '#1c1917' },
  { name: 'icon-512x512.png', size: 512, color: '#1c1917' },
  { name: 'favicon.ico_desc', size: 32, color: '#1c1917' },
];

// Write SVG icons as PNG fallback placeholder
// In production, replace with real PNG icons generated from design assets
for (const icon of icons) {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${icon.size}" height="${icon.size}" viewBox="0 0 ${icon.size} ${icon.size}">
  <rect width="${icon.size}" height="${icon.size}" rx="${icon.size * 0.08}" fill="${icon.color}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="${icon.size * 0.4}" font-weight="bold" fill="#d97706">B</text>
</svg>`;
  writeFileSync(join(iconsDir, icon.name.replace('.png', '.svg')), svgContent);
  console.log(`Generated ${icon.name.replace('.png', '.svg')}`);
}

console.log('\nIcons generated. In production, replace these with actual PNG icons.');
console.log('You can use tools like: https://realfavicongenerator.net/');
