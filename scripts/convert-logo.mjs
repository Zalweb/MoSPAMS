/**
 * convert-logo.mjs
 * Converts MoSPAMS_Logo.jpg to PNG assets required by the frontend.
 * Run: node scripts/convert-logo.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcLogo = path.join(root, 'MoSPAMS_Logo.jpg');
const outDir = path.join(root, 'Frontend', 'public', 'images');

// Ensure output dir exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let sharp;
try {
  const require = createRequire(import.meta.url);
  sharp = require('sharp');
} catch {
  console.error('sharp is not installed. Installing now...');
  console.error('Run: npm install --save-dev sharp   (in the Frontend folder, or globally)');
  process.exit(1);
}

const outputs = [
  { file: 'logo.png',      size: null },   // original dimensions, PNG
  { file: 'icon-192.png',  size: 192  },
  { file: 'icon-512.png',  size: 512  },
];

for (const { file, size } of outputs) {
  const dest = path.join(outDir, file);
  let pipeline = sharp(srcLogo).png({ quality: 100 });
  if (size) pipeline = pipeline.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  await pipeline.toFile(dest);
  console.log(`✅  ${file}  →  ${dest}`);
}

console.log('\nAll logo assets generated successfully.');
