const sharp = require('sharp');
const fs = require('fs');

/**
 * Android Adaptive Icon & PWA Specification:
 * - Canvas: 512x512
 * - Android Safe Zone: 66% circle (radius = 169px from center)
 * - Standard visual weight: graphic width = ~45-48% of canvas (~230-245px)
 * - Background: full-bleed solid color with 0px corner radius so launcher masks (circle/squircle/teardrop)
 *   fill edge-to-edge without cut-off borders or nested shapes.
 */

// 1. Adaptive Maskable SVG Template (Full bleed background, safe zone scaled clapperboard)
const MASKABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Full Bleed Square Background for Android Adaptive Mask (No rounded corners) -->
  <rect width="512" height="512" fill="#FBA4BC"/>

  <!-- Centered Clapperboard Scaled to 45% (Safe Zone: max radius 161px < 169px safe zone) -->
  <g transform="translate(256 256) scale(0.60) translate(-256 -260)">
    <!-- Top Angled Clapper Stick -->
    <g transform="rotate(-6 256 160)">
      <rect x="64" y="80" width="384" height="88" rx="28" fill="#FFFFFF" stroke="#20102B" stroke-width="20" stroke-linejoin="round"/>
      <line x1="144" y1="80" x2="176" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
      <line x1="224" y1="80" x2="256" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
      <line x1="304" y1="80" x2="336" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
      <line x1="384" y1="80" x2="416" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
    </g>

    <!-- Main Clapper Body -->
    <rect x="64" y="192" width="384" height="256" rx="48" fill="#FFFFFF" stroke="#20102B" stroke-width="20" stroke-linejoin="round"/>

    <!-- Centered Play Mark in Deep Purple -->
    <polygon points="224,272 224,368 320,320" fill="#4F266F" stroke="#4F266F" stroke-width="12" stroke-linejoin="round"/>
  </g>
</svg>
`.trim();

// 2. Standard "Any" SVG Template (For desktop tabs, standalone squircle, comfortable margins)
const STANDARD_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Rounded Squircle Base for Standard Non-Maskable Displays -->
  <rect width="512" height="512" rx="112" fill="#FBA4BC"/>

  <!-- Centered Clapper Graphic with Balanced Breathing Room (scale 0.64) -->
  <g transform="translate(256 256) scale(0.64) translate(-256 -260)">
    <!-- Top Angled Clapper Stick -->
    <g transform="rotate(-6 256 160)">
      <rect x="64" y="80" width="384" height="88" rx="28" fill="#FFFFFF" stroke="#20102B" stroke-width="20" stroke-linejoin="round"/>
      <line x1="144" y1="80" x2="176" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
      <line x1="224" y1="80" x2="256" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
      <line x1="304" y1="80" x2="336" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
      <line x1="384" y1="80" x2="416" y2="168" stroke="#20102B" stroke-width="20" stroke-linecap="round"/>
    </g>

    <!-- Main Clapper Body -->
    <rect x="64" y="192" width="384" height="256" rx="48" fill="#FFFFFF" stroke="#20102B" stroke-width="20" stroke-linejoin="round"/>

    <!-- Centered Play Mark in Deep Purple -->
    <polygon points="224,272 224,368 320,320" fill="#4F266F" stroke="#4F266F" stroke-width="12" stroke-linejoin="round"/>
  </g>
</svg>
`.trim();

async function generateIcons() {
  try {
    fs.mkdirSync('public/icons', { recursive: true });

    // Save SVG sources for reference and direct vector use
    fs.writeFileSync('public/icon.svg', STANDARD_SVG);
    fs.writeFileSync('public/icons/icon-maskable.svg', MASKABLE_SVG);
    fs.writeFileSync('public/icons/icon-standard.svg', STANDARD_SVG);
    console.log('Saved SVG icon templates');

    const maskableBuffer = Buffer.from(MASKABLE_SVG);
    const standardBuffer = Buffer.from(STANDARD_SVG);

    // 1. Android Adaptive Maskable 512x512
    await sharp(maskableBuffer)
      .resize(512, 512)
      .png({ compressionLevel: 9 })
      .toFile('public/icons/icon-512-maskable-v2.png');
    console.log('✓ Generated Android adaptive maskable 512x512 icon');

    // 2. Android Adaptive Maskable 192x192 (Crucial for Android WebAPK density matching)
    await sharp(maskableBuffer)
      .resize(192, 192)
      .png({ compressionLevel: 9 })
      .toFile('public/icons/icon-192-maskable-v2.png');
    console.log('✓ Generated Android adaptive maskable 192x192 icon');

    // 3. Standard 512x512 (purpose: "any")
    await sharp(standardBuffer)
      .resize(512, 512)
      .png({ compressionLevel: 9 })
      .toFile('public/icons/icon-512-v2.png');
    console.log('✓ Generated standard 512x512 icon');

    // 4. Standard 192x192 (purpose: "any")
    await sharp(standardBuffer)
      .resize(192, 192)
      .png({ compressionLevel: 9 })
      .toFile('public/icons/icon-192-v2.png');
    console.log('✓ Generated standard 192x192 icon');

    // 5. Apple Touch Icon 180x180 (iOS Safari requires solid full-bleed background)
    await sharp(maskableBuffer)
      .resize(180, 180)
      .png({ compressionLevel: 9 })
      .toFile('public/icons/apple-touch-icon-v2.png');
    console.log('✓ Generated Apple Touch Icon 180x180 (solid full bleed for iOS squircle)');

    console.log('All icons generated successfully with Android Adaptive compliance!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generateIcons();
