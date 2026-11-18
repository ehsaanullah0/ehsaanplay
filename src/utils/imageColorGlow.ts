import { useState, useEffect } from 'react';
import { ARTWORK_CACHE_NAME } from '../services/imageStorage';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface DirectionalGlowPalette {
  topLeft: RGBColor;
  topCenter: RGBColor;
  topRight: RGBColor;
  leftMid: RGBColor;
  rightMid: RGBColor;
  bottomLeft: RGBColor;
  bottomCenter: RGBColor;
  bottomRight: RGBColor;
}

const SAMPLE_WIDTH = 24;
const SAMPLE_HEIGHT = 36;
const MAX_CACHE_ENTRIES = 120;

const paletteCache = new Map<string, DirectionalGlowPalette>();
const inFlightRequests = new Map<string, Promise<DirectionalGlowPalette | null>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h /= 6;

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGBColor {
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Refines sampled region colors so the glow stays clean, smooth, and natural —
 * preventing clipped neon highlights or muddy black shadows without inventing artificial hues.
 */
function refineGlowColor(color: RGBColor): RGBColor {
  const [h, rawS, rawL] = rgbToHsl(color.r, color.g, color.b);

  // Gently compress extreme neon saturation so glow remains refined, not funky
  const s = rawS > 0.72 ? 0.72 + (rawS - 0.72) * 0.32 : rawS;

  // Lift near-black tints slightly if hue is present, and soften harsh pure-white highlights
  let l = rawL;
  if (l < 0.24) {
    l = s > 0.08 ? 0.22 + (l / 0.24) * 0.08 : 0.20 + l * 0.25;
  } else if (l > 0.78) {
    l = 0.78 - (l - 0.78) * 0.35;
  }

  return hslToRgb(h, s, l);
}

interface ZoneBounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  edgeBias: 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
}

function sampleRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: ZoneBounds
): RGBColor {
  let chromaR = 0;
  let chromaG = 0;
  let chromaB = 0;
  let chromaWeight = 0;

  let allR = 0;
  let allG = 0;
  let allB = 0;
  let allWeight = 0;

  for (let y = bounds.y0; y < bounds.y1; y++) {
    for (let x = bounds.x0; x < bounds.x1; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 24) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Pixels closer to the outer card perimeter carry higher influence for the outer halo
      let edgeFactor = 1.0;
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      if (bounds.edgeBias.includes('top')) edgeFactor += (1 - ny) * 0.65;
      if (bounds.edgeBias.includes('bottom')) edgeFactor += ny * 0.65;
      if (bounds.edgeBias.includes('left')) edgeFactor += (1 - nx) * 0.55;
      if (bounds.edgeBias.includes('right')) edgeFactor += nx * 0.55;

      allR += r * edgeFactor;
      allG += g * edgeFactor;
      allB += b * edgeFactor;
      allWeight += edgeFactor;

      // Skip crushed black bars / pure white text in chromatic tally when rich colors exist
      if (max >= 20 && min <= 242 && sat > 0.1 && luma > 0.07 && luma < 0.94) {
        const w = edgeFactor * (0.45 + Math.pow(sat, 1.25) * 1.8);
        chromaR += r * w;
        chromaG += g * w;
        chromaB += b * w;
        chromaWeight += w;
      }
    }
  }

  if (allWeight === 0) {
    return { r: 120, g: 120, b: 128 };
  }

  const avgAll: RGBColor = {
    r: allR / allWeight,
    g: allG / allWeight,
    b: allB / allWeight,
  };

  if (chromaWeight > allWeight * 0.14) {
    const avgChroma: RGBColor = {
      r: chromaR / chromaWeight,
      g: chromaG / chromaWeight,
      b: chromaB / chromaWeight,
    };
    return refineGlowColor({
      r: Math.round(avgChroma.r * 0.86 + avgAll.r * 0.14),
      g: Math.round(avgChroma.g * 0.86 + avgAll.g * 0.14),
      b: Math.round(avgChroma.b * 0.86 + avgAll.b * 0.14),
    });
  }

  return refineGlowColor({
    r: Math.round(avgAll.r),
    g: Math.round(avgAll.g),
    b: Math.round(avgAll.b),
  });
}

/**
 * Extracts 8 directional edge colors directly from ImageData (24x36 grid).
 */
export function extractDirectionalGlowFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DirectionalGlowPalette {
  const xQuarter = Math.floor(width * 0.25);
  const xHalf = Math.floor(width * 0.5);
  const xThreeQuarter = Math.floor(width * 0.75);
  const xLeftBand = Math.max(2, Math.floor(width * 0.32));
  const xRightBand = Math.min(width - 2, Math.floor(width * 0.68));

  const yTopBand = Math.max(3, Math.floor(height * 0.34));
  const yMidTop = Math.floor(height * 0.28);
  const yMidBottom = Math.floor(height * 0.72);
  const yBottomBand = Math.min(height - 3, Math.floor(height * 0.66));

  return {
    topLeft: sampleRegion(data, width, height, {
      x0: 0,
      x1: xHalf,
      y0: 0,
      y1: yTopBand,
      edgeBias: 'top-left',
    }),
    topCenter: sampleRegion(data, width, height, {
      x0: xQuarter,
      x1: xThreeQuarter,
      y0: 0,
      y1: yTopBand,
      edgeBias: 'top',
    }),
    topRight: sampleRegion(data, width, height, {
      x0: xHalf,
      x1: width,
      y0: 0,
      y1: yTopBand,
      edgeBias: 'top-right',
    }),
    leftMid: sampleRegion(data, width, height, {
      x0: 0,
      x1: xLeftBand,
      y0: yMidTop,
      y1: yMidBottom,
      edgeBias: 'left',
    }),
    rightMid: sampleRegion(data, width, height, {
      x0: xRightBand,
      x1: width,
      y0: yMidTop,
      y1: yMidBottom,
      edgeBias: 'right',
    }),
    bottomLeft: sampleRegion(data, width, height, {
      x0: 0,
      x1: xHalf,
      y0: yBottomBand,
      y1: height,
      edgeBias: 'bottom-left',
    }),
    bottomCenter: sampleRegion(data, width, height, {
      x0: xQuarter,
      x1: xThreeQuarter,
      y0: yBottomBand,
      y1: height,
      edgeBias: 'bottom',
    }),
    bottomRight: sampleRegion(data, width, height, {
      x0: xHalf,
      x1: width,
      y0: yBottomBand,
      y1: height,
      edgeBias: 'bottom-right',
    }),
  };
}

function sampleImageElement(img: HTMLImageElement): DirectionalGlowPalette | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const imageData = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    return extractDirectionalGlowFromImageData(imageData.data, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  } catch {
    return null;
  }
}

function loadImgFromSrc(src: string, useAnonymousCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useAnonymousCors) {
      img.crossOrigin = 'anonymous';
    }
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

function rememberPalette(key: string, palette: DirectionalGlowPalette) {
  if (paletteCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = paletteCache.keys().next().value;
    if (oldest) paletteCache.delete(oldest);
  }
  paletteCache.set(key, palette);
}

async function fetchPaletteInternal(src: string): Promise<DirectionalGlowPalette | null> {
  if (typeof window === 'undefined' || !src) return null;

  // 1. Local data: or blob: URL (direct zero-network sample)
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    try {
      const img = await loadImgFromSrc(src, false);
      const palette = sampleImageElement(img);
      if (palette) rememberPalette(src, palette);
      return palette;
    } catch {
      return null;
    }
  }

  // 2. Check offline Cache API first so pre-cached posters resolve instantaneously
  if ('caches' in window) {
    try {
      const cache = await caches.open(ARTWORK_CACHE_NAME);
      const match = await cache.match(src, { ignoreSearch: true, ignoreVary: true });
      if (match) {
        const blob = await match.blob();
        if (blob && blob.size > 0) {
          const tempUrl = URL.createObjectURL(blob);
          try {
            const img = await loadImgFromSrc(tempUrl, false);
            const palette = sampleImageElement(img);
            if (palette) {
              rememberPalette(src, palette);
              return palette;
            }
          } finally {
            URL.revokeObjectURL(tempUrl);
          }
        }
      }
    } catch {
      // fall through to proxy/CORS fetch
    }
  }

  // 3. Same-origin or server-side CORS proxy (avoids browser CORS console errors when host already cached non-CORS)
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          const tempUrl = URL.createObjectURL(blob);
          try {
            const img = await loadImgFromSrc(tempUrl, false);
            const palette = sampleImageElement(img);
            if (palette) {
              rememberPalette(src, palette);
              return palette;
            }
          } finally {
            URL.revokeObjectURL(tempUrl);
          }
        }
      }
    } catch {
      // fall through to direct CORS attempt
    }

    // 4. Direct CORS fallback (for local/custom CORS-enabled hosts)
    try {
      const img = await loadImgFromSrc(src, true);
      const palette = sampleImageElement(img);
      if (palette) {
        rememberPalette(src, palette);
        return palette;
      }
    } catch {
      return null;
    }
  } else {
    // Relative local public path
    try {
      const img = await loadImgFromSrc(src, false);
      const palette = sampleImageElement(img);
      if (palette) {
        rememberPalette(src, palette);
        return palette;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function getDirectionalGlowForSrc(
  src?: string | null,
  fallbackSrc?: string | null
): Promise<DirectionalGlowPalette | null> {
  const candidates = [src, fallbackSrc].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  );

  for (const candidate of candidates) {
    const cached = paletteCache.get(candidate);
    if (cached) return cached;

    let pending = inFlightRequests.get(candidate);
    if (!pending) {
      pending = fetchPaletteInternal(candidate).finally(() => {
        inFlightRequests.delete(candidate);
      });
      inFlightRequests.set(candidate, pending);
    }

    const result = await pending;
    if (result) return result;
  }

  return null;
}

function rgba(c: RGBColor, alpha: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function clampContrastColor(c: RGBColor, contrast: number): RGBColor {
  if (Math.abs(contrast - 1.0) < 0.01) return c;
  const [h, rawS, rawL] = rgbToHsl(c.r, c.g, c.b);
  const delta = contrast - 1.0; // [-0.75 .. +1.0]

  // Scale saturation cleanly and expand lightness slightly away from 0.5 for higher contrast
  const nextS = Math.max(0, Math.min(0.95, rawS * (1 + delta * 0.45)));
  const centeredL = rawL - 0.5;
  const nextL = Math.max(0.14, Math.min(0.86, 0.5 + centeredL * (1 + delta * 0.35)));
  return hslToRgb(h, nextS, nextL);
}

/**
 * Adjusts color contrast & chromatic separation across all 8 directional regions.
 */
export function applyGlowContrast(
  palette: DirectionalGlowPalette,
  contrast = 1.0
): DirectionalGlowPalette {
  const c = Math.max(0.25, Math.min(2.0, contrast));
  if (Math.abs(c - 1.0) < 0.01) return palette;

  return {
    topLeft: clampContrastColor(palette.topLeft, c),
    topCenter: clampContrastColor(palette.topCenter, c),
    topRight: clampContrastColor(palette.topRight, c),
    leftMid: clampContrastColor(palette.leftMid, c),
    rightMid: clampContrastColor(palette.rightMid, c),
    bottomLeft: clampContrastColor(palette.bottomLeft, c),
    bottomCenter: clampContrastColor(palette.bottomCenter, c),
    bottomRight: clampContrastColor(palette.bottomRight, c),
  };
}

/**
 * Builds a multi-point directional gradient background matching all 8 perimeter regions.
 */
export function buildDirectionalGlowGradient(
  palette: DirectionalGlowPalette,
  peakAlpha = 0.62
): string {
  const clampedPeak = Math.max(0.05, Math.min(0.98, peakAlpha));
  const edgeAlpha = Number((clampedPeak * 0.85).toFixed(2));
  const midAlpha = Number((clampedPeak * 0.72).toFixed(2));

  return [
    `radial-gradient(ellipse 68% 48% at 16% 6%, ${rgba(palette.topLeft, clampedPeak)} 0%, transparent 72%)`,
    `radial-gradient(ellipse 72% 44% at 50% 2%, ${rgba(palette.topCenter, edgeAlpha)} 0%, transparent 70%)`,
    `radial-gradient(ellipse 68% 48% at 84% 6%, ${rgba(palette.topRight, clampedPeak)} 0%, transparent 72%)`,
    `radial-gradient(ellipse 46% 64% at 3% 50%, ${rgba(palette.leftMid, midAlpha)} 0%, transparent 70%)`,
    `radial-gradient(ellipse 46% 64% at 97% 50%, ${rgba(palette.rightMid, midAlpha)} 0%, transparent 70%)`,
    `radial-gradient(ellipse 68% 48% at 16% 94%, ${rgba(palette.bottomLeft, clampedPeak)} 0%, transparent 72%)`,
    `radial-gradient(ellipse 72% 44% at 50% 98%, ${rgba(palette.bottomCenter, edgeAlpha)} 0%, transparent 70%)`,
    `radial-gradient(ellipse 68% 48% at 84% 94%, ${rgba(palette.bottomRight, clampedPeak)} 0%, transparent 72%)`,
  ].join(', ');
}

/**
 * Hook that computes and caches the directional color palette around a poster image.
 */
export function useDirectionalImageGlow(
  src?: string | null,
  fallbackSrc?: string | null,
  enabled = true
): DirectionalGlowPalette | null {
  const [palette, setPalette] = useState<DirectionalGlowPalette | null>(() => {
    if (!enabled || !src) return null;
    return paletteCache.get(src) || null;
  });

  useEffect(() => {
    if (!enabled || (!src && !fallbackSrc)) {
      setPalette(null);
      return;
    }

    if (src && paletteCache.has(src)) {
      setPalette(paletteCache.get(src) || null);
      return;
    }

    let cancelled = false;
    setPalette(null);

    getDirectionalGlowForSrc(src, fallbackSrc).then((result) => {
      if (!cancelled) {
        setPalette(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, fallbackSrc, enabled]);

  return palette;
}
