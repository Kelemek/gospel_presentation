#!/usr/bin/env node
/**
 * Generate web and native app icons from the master PNG.
 * Requires ImageMagick (brew install imagemagick).
 *
 * Raw art: resources/icon-source-raw.png (1024×1024 3D render, square canvas)
 * Master:  resources/icon-source.png (legacy roundrect rx=20 @ 180px, white corners)
 * Preview: resources/icon.png (1024×1024 copy of master)
 *
 * Corner radius matches the old apple-touch-icon.svg (rx=20 on 180px). Content is
 * scaled slightly before masking so the navy edge aligns with that curve (~11% of width).
 * iOS/Android store square PNGs; iOS applies its own squircle on the home screen.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const rawSrc = path.join(root, 'resources', 'icon-source-raw.png');
const src = path.join(root, 'resources', 'icon-source.png');
const roundedMaster = path.join(root, 'resources', 'icon.png');

/** Same as legacy public/apple-touch-icon.svg: rx=20 on a 180px canvas. */
const LEGACY_RX_AT_180 = 20;
/** Zoom raw art so the navy fill meets the legacy roundrect (~118px @ 1024 on old icon). */
const SOURCE_SCALE = 1.02;
const MASTER_SIZE = 1024;

const cornerRadiusFor = (size) => Math.max(2, Math.round((size * LEGACY_RX_AT_180) / 180));

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

const resizeSquare = (size, inPath, outPath) => {
  execSync(`"${magickCmd}" "${inPath}" -resize ${size}x${size} "${outPath}"`, { stdio: 'ignore' });
};

const normalizeSourceFromRaw = (outPath) => {
  const size = MASTER_SIZE;
  const r = cornerRadiusFor(size);
  const w = size - 1;
  const scalePct = Math.round(SOURCE_SCALE * 100);
  const tmp = path.join(root, '.icon-normalize-tmp.png');
  execSync(
    `"${magickCmd}" "${rawSrc}" ` +
      `-resize ${scalePct}% -gravity center -extent ${size}x${size} -background white ` +
      `-alpha set -channel A -evaluate set 100% +channel ` +
      `\\( -size ${size}x${size} xc:none -draw "fill white roundrectangle 0,0 ${w},${w} ${r},${r}" \\) ` +
      `-compose DstIn -composite -background white -alpha remove "${tmp}"`,
    { stdio: 'ignore' }
  );
  fs.renameSync(tmp, outPath);
};

if (fs.existsSync(rawSrc)) {
  normalizeSourceFromRaw(src);
  console.log(
    `Normalized ${path.relative(root, src)} from raw art (rx=${LEGACY_RX_AT_180}@180, scale ${Math.round(SOURCE_SCALE * 100)}%)`
  );
} else if (!fs.existsSync(src)) {
  const legacy = path.join(root, 'resources', 'icon.png');
  if (!fs.existsSync(legacy)) {
    console.error('No icon found at resources/icon-source-raw.png or resources/icon-source.png');
    process.exit(1);
  }
  fs.copyFileSync(legacy, src);
}

// Reference copy at full size
resizeSquare(MASTER_SIZE, src, roundedMaster);
console.log('Icon preview:', roundedMaster);

// Web: favicon + apple touch. Use public/favicon.png — /icon conflicts with [slug].
resizeSquare(32, src, path.join(root, 'public', 'favicon.png'));
resizeSquare(180, src, path.join(root, 'public', 'apple-touch-icon.png'));
console.log('Web icons generated: public/favicon.png, public/apple-touch-icon.png');

// iOS: 1024x1024 app icon (square pixels — iOS applies squircle mask)
const iosDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const iosIcon = path.join(iosDir, 'AppIcon-512@2x.png');
resizeSquare(MASTER_SIZE, src, iosIcon);
console.log('iOS icon generated:', iosIcon);

// iOS: Launch screen — same master as AppIcon (white corners on white splash)
const launchIconDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'LaunchIcon.imageset');
if (!fs.existsSync(launchIconDir)) fs.mkdirSync(launchIconDir, { recursive: true });
resizeSquare(MASTER_SIZE, src, path.join(launchIconDir, 'LaunchIcon.png'));
console.log('iOS launch icon generated');

// Android mipmap sizes (square — adaptive icon applies device mask)
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
    resizeSquare(size, src, path.join(outDir, name));
  }
  console.log(`Android ${dir}: ${size}x${size} generated`);
}

console.log('Done. Run "npx cap sync" to apply changes.');
