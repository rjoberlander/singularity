/**
 * Generate placeholder app icons for Singularity mobile app
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Brand colors
const PRIMARY_COLOR = '#10b981'; // Emerald green
const BG_COLOR = '#0a0a0a'; // Dark background

// Create a simple icon with "S" letter
async function createIcon(size, filename, hasBackground = true) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${hasBackground ? BG_COLOR : 'transparent'}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="${PRIMARY_COLOR}"/>
      <text
        x="${size/2}"
        y="${size/2 + size * 0.15}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.45}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
      >S</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(assetsDir, filename));

  console.log(`Created ${filename} (${size}x${size})`);
}

// Create splash screen
async function createSplash(width, height, filename) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${BG_COLOR}"/>
      <circle cx="${width/2}" cy="${height/2 - 50}" r="80" fill="${PRIMARY_COLOR}"/>
      <text
        x="${width/2}"
        y="${height/2 + 10}"
        font-family="Arial, sans-serif"
        font-size="72"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
      >S</text>
      <text
        x="${width/2}"
        y="${height/2 + 120}"
        font-family="Arial, sans-serif"
        font-size="36"
        fill="${PRIMARY_COLOR}"
        text-anchor="middle"
      >Singularity</text>
      <text
        x="${width/2}"
        y="${height/2 + 170}"
        font-family="Arial, sans-serif"
        font-size="18"
        fill="#6b7280"
        text-anchor="middle"
      >Health Optimization</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(assetsDir, filename));

  console.log(`Created ${filename} (${width}x${height})`);
}

async function main() {
  console.log('Generating app icons...\n');

  // App icon (1024x1024)
  await createIcon(1024, 'icon.png');

  // Adaptive icon foreground (1024x1024, transparent background for Android)
  await createIcon(1024, 'adaptive-icon.png', false);

  // Favicon (48x48)
  await createIcon(48, 'favicon.png');

  // Splash screen (1284x2778 for iPhone 14 Pro Max)
  await createSplash(1284, 2778, 'splash.png');

  console.log('\nDone! All icons created in assets/ folder.');
}

main().catch(console.error);
