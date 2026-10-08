const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  try {
    // Ensure the destination icons folder exists
    fs.mkdirSync('public/icons', { recursive: true });
    console.log('Created icons directory: public/icons');

    const sourceSvg = 'public/icon.svg';

    // 1. Generate standard 512x512 PNG
    await sharp(sourceSvg)
      .resize(512, 512)
      .png()
      .toFile('public/icons/icon-512-v2.png');
    console.log('Generated standard 512x512 PWA icon');

    // 2. Generate standard 192x192 PNG
    await sharp(sourceSvg)
      .resize(192, 192)
      .png()
      .toFile('public/icons/icon-192-v2.png');
    console.log('Generated standard 192x192 PWA icon');

    // 3. Generate standard Apple Touch Icon 180x180 PNG (required for iOS Safari)
    await sharp(sourceSvg)
      .resize(180, 180)
      .png()
      .toFile('public/icons/apple-touch-icon-v2.png');
    console.log('Generated iOS apple-touch-icon (180x180)');

    // 4. Generate dedicated 512x512 Maskable PWA icon with 10-15% safe padding
    // We scale down the original 512x512 logo (including pink background) to 384x384 (75%)
    // and composite it onto a 512x512 background of the exact same solid pink color (#FBA4BC).
    const scaledLogoBuffer = await sharp(sourceSvg)
      .resize(384, 384)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: '#FBA4BC' // Solid pink background matching the squircle
      }
    })
      .composite([{
        input: scaledLogoBuffer,
        top: 64, // Center vertically: (512 - 384) / 2 = 64
        left: 64 // Center horizontally: (512 - 384) / 2 = 64
      }])
      .png()
      .toFile('public/icons/icon-512-maskable-v2.png');
    console.log('Generated Android safe maskable 512x512 PWA icon (75% logo size + #FBA4BC padding)');

    console.log('Icon generation completed successfully!');
  } catch (err) {
    console.error('Error generating PWA icons:', err);
    process.exit(1);
  }
}

generateIcons();
