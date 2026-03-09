/**
 * Resize images in appstoreimg/ to App Store approved dimensions.
 * Portrait (h > w): 1242 × 2688
 * Landscape (w >= h): 2688 × 1242
 * Uses "cover" so image fills the frame (cropped if needed).
 */

const path = require('path');
const fs = require('fs');

const APPSTORE_SIZES = {
  portrait: { width: 1242, height: 2688 },
  landscape: { width: 2688, height: 1242 },
};

const SOURCE_DIR = path.join(__dirname, '..', 'appstoreimg');
const OUT_DIR = path.join(__dirname, '..', 'appstoreimg');

async function main() {
  const sharp = require('sharp');
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (files.length === 0) {
    console.log('No images found in appstoreimg/');
    return;
  }
  for (const file of files) {
    const srcPath = path.join(SOURCE_DIR, file);
    const tempPath = path.join(SOURCE_DIR, `.resize-tmp-${file}`);
    const meta = await sharp(srcPath).metadata();
    const isPortrait = (meta.height || 0) > (meta.width || 0);
    const { width, height } = isPortrait ? APPSTORE_SIZES.portrait : APPSTORE_SIZES.landscape;
    const ext = path.extname(file).toLowerCase();
    const isJpeg = ext === '.jpg' || ext === '.jpeg';
    let pipeline = sharp(srcPath).resize(width, height, { fit: 'cover', position: 'center' });
    if (isJpeg) {
      pipeline = pipeline.jpeg({ quality: 90 });
    } else {
      pipeline = pipeline.png({ compressionLevel: 6 });
    }
    await pipeline.toFile(tempPath);
    fs.renameSync(tempPath, srcPath);
    console.log(`${file} → ${width}×${height}`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
