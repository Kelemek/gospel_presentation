#!/usr/bin/env node
/**
 * Generate native app icons from assets/icon.svg for iOS and Android.
 * Requires ImageMagick (brew install imagemagick).
 * Source: assets/icon.svg (or public/apple-touch-icon.svg)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
// Single source: same icon used for web (apple-touch-icon) and native apps
const src = path.join(root, 'public', 'apple-touch-icon.svg');

if (!fs.existsSync(src)) {
  console.error('No icon found at public/apple-touch-icon.svg');
  process.exit(1);
}

let magickCmd = 'magick';
try {
  execSync(`${magickCmd} -version`, { stdio: 'ignore' });
} catch {
  magickCmd = 'convert'; // ImageMagick 6 / legacy
  try {
    execSync(`${magickCmd} -version`, { stdio: 'ignore' });
  } catch {
    console.error('ImageMagick is required. Install with: brew install imagemagick');
    process.exit(1);
  }
}

// iOS: 1024x1024 app icon
const iosDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const iosIcon = path.join(iosDir, 'AppIcon-512@2x.png');
execSync(
  `"${magickCmd}" "${src}" -resize 1024x1024 "${iosIcon}"`,
  { stdio: 'inherit' }
);
console.log('iOS icon generated:', iosIcon);

// iOS: Launch screen icon (original app icon, centered on white splash)
const launchIconDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'LaunchIcon.imageset');
if (!fs.existsSync(launchIconDir)) fs.mkdirSync(launchIconDir, { recursive: true });
const launchIcon = path.join(launchIconDir, 'LaunchIcon.png');
execSync(
  `"${magickCmd}" "${src}" -resize 1024x1024 "${launchIcon}"`,
  { stdio: 'inherit' }
);
console.log('iOS launch icon generated:', launchIcon);

// Android mipmap sizes (nominal dp -> pixel at that density)
const androidSizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');

for (const { dir, size } of androidSizes) {
  const outDir = path.join(androidRes, dir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    const out = path.join(outDir, name);
    execSync(
      `"${magickCmd}" "${src}" -resize ${size}x${size} "${out}"`,
      { stdio: 'ignore' }
    );
  }
  console.log(`Android ${dir}: ${size}x${size} generated`);
}

console.log('Done. Run "npx cap sync" to apply changes.');