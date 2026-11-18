import React from 'react';
import {
  applyGlowContrast,
  buildDirectionalGlowGradient,
  useDirectionalImageGlow,
} from '../../utils/imageColorGlow';

interface PosterAmbientGlowProps {
  src?: string | null;
  fallbackSrc?: string | null;
  enabled?: boolean;
  contrast?: number; // 0.25 to 2.0 (default: 1.0)
  isDarkSurface?: boolean;
  className?: string;
  haloRoundedClass?: string;
  rimRoundedClass?: string;
  children: React.ReactNode;
}

/**
 * Renders a subtle, clean, directional ambient aura around a movie poster card
 * matching the spatial colors of the artwork (e.g. orange top, blue bottom).
 */
export const PosterAmbientGlow: React.FC<PosterAmbientGlowProps> = ({
  src,
  fallbackSrc,
  enabled = true,
  contrast = 1.0,
  isDarkSurface = false,
  className = '',
  haloRoundedClass = 'rounded-[26px] sm:rounded-[36px]',
  rimRoundedClass = 'rounded-[18px] sm:rounded-[26px]',
  children,
}) => {
  const palette = useDirectionalImageGlow(src, fallbackSrc, enabled);
  const showGlow = Boolean(enabled && palette);
  const safeContrast = Math.max(0.25, Math.min(2.0, Number.isFinite(contrast) ? contrast : 1.0));

  const contrastedPalette = palette ? applyGlowContrast(palette, safeContrast) : null;

  // Compute subtle scaled opacities and peak gradient alpha from contrast [0.25 .. 2.0]
  const baseOuterOpacity = isDarkSurface ? 0.45 : 0.35;
  const baseRimOpacity = isDarkSurface ? 0.35 : 0.25;
  const scaleFactor =
    safeContrast >= 1.0
      ? 1.0 + (safeContrast - 1.0) * 0.85
      : Math.max(0.32, safeContrast);

  const outerOpacity = showGlow ? Math.min(0.92, baseOuterOpacity * scaleFactor) : 0;
  const rimOpacity = showGlow ? Math.min(0.86, baseRimOpacity * scaleFactor) : 0;

  const outerPeak = (isDarkSurface ? 0.64 : 0.44) * (safeContrast >= 1.0 ? 1 + (safeContrast - 1.0) * 0.38 : 0.75 + safeContrast * 0.25);
  const rimPeak = (isDarkSurface ? 0.72 : 0.48) * (safeContrast >= 1.0 ? 1 + (safeContrast - 1.0) * 0.34 : 0.75 + safeContrast * 0.25);

  const outerGradient = contrastedPalette
    ? buildDirectionalGlowGradient(contrastedPalette, outerPeak)
    : undefined;
  const rimGradient = contrastedPalette
    ? buildDirectionalGlowGradient(contrastedPalette, rimPeak)
    : undefined;

  return (
    <div className={`relative group/poster-glow ${className}`}>
      {/* Layer 1: Wide soft ambient halo following edge color combinations */}
      <div
        aria-hidden="true"
        className={`pointer-events-none select-none absolute -inset-3 sm:-inset-4 ${haloRoundedClass} blur-xl sm:blur-2xl transition-opacity duration-500 ease-out motion-reduce:transition-none z-0`}
        style={{
          backgroundImage: outerGradient,
          opacity: outerOpacity,
        }}
      />

      {/* Layer 2: Crisp tight edge illumination hugging the card frame */}
      <div
        aria-hidden="true"
        className={`pointer-events-none select-none absolute -inset-[3px] ${rimRoundedClass} blur-[6px] transition-opacity duration-500 ease-out motion-reduce:transition-none z-0`}
        style={{
          backgroundImage: rimGradient,
          opacity: rimOpacity,
        }}
      />

      {/* Foreground Poster Card */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
