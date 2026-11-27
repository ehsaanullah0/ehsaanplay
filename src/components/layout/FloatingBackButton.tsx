import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen';

interface FloatingBackButtonProps {
  visible: boolean;
  onBack: () => void;
  isGenreMixing?: boolean;
}

/**
 * Generates a smooth closed 10-scallop Material 3 Expressive wavy circular SVG path.
 */
function buildWavyCirclePath(scale = 64, lobes = 10, amplitude = 0.045): string {
  const half = scale / 2;
  const baseRadius = 0.43 * scale;
  const amp = amplitude * scale;
  const samples = lobes * 6;
  const pts: [number, number][] = [];

  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    const r = baseRadius + amp * Math.cos(lobes * theta);
    pts.push([half + r * Math.cos(theta), half + r * Math.sin(theta)]);
  }

  const n = pts.length;
  const fmt = (v: number) => Number(v.toFixed(3));
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return `${d} Z`;
}

const WAVY_CIRCLE_PATH = buildWavyCirclePath(64, 10, 0.044);

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = React.memo(({
  visible,
  onBack,
  isGenreMixing = false,
}) => {
  const { isFullscreen } = useFullscreen();

  if (!visible) return null;

  // Match BottomNavigation vertical baseline (bottom + h-16 vertical center) so the standalone
  // wavy back button sits on the exact same level without merging into the centered dock.
  // Only shift above on narrow screens when the full-width Mix Mode bar expands across the bottom.
  const bottomStyle: React.CSSProperties | undefined = isGenreMixing
    ? undefined
    : {
        bottom: isFullscreen
          ? 'calc(1.1rem + env(safe-area-inset-bottom, 0px))'
          : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      };

  const bottomFallbackClass = isGenreMixing
    ? isFullscreen
      ? 'bottom-[calc(5.6rem+env(safe-area-inset-bottom,0px))] md:bottom-[calc(1.1rem+env(safe-area-inset-bottom,0px))]'
      : 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]'
    : '';

  return (
    <div
      style={bottomStyle}
      className={`fixed left-1.5 xs:left-3 sm:left-5 md:left-6 z-[120] h-16 flex items-center pointer-events-none ${bottomFallbackClass}`}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        title="Go back"
        className="pointer-events-auto relative group w-11 h-11 xs:w-12 xs:h-12 sm:w-[52px] sm:h-[52px] flex items-center justify-center rounded-full select-none touch-manipulation cursor-pointer transition-all duration-200 hover:scale-105 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 animate-scale-up"
      >
        {/* Wavy Circular Expressive Contour */}
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible transition-transform duration-300 ease-out group-hover:-rotate-12"
          style={{
            filter:
              'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.24)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.14))',
          }}
        >
          <path
            d={WAVY_CIRCLE_PATH}
            className="fill-[var(--bg-nav-container)] transition-colors duration-200"
            style={{
              stroke: 'var(--nav-dock-border, var(--border-subtle))',
              strokeWidth: 2.2,
              strokeLinejoin: 'round',
            }}
          />
        </svg>

        {/* Crisp Back Arrow */}
        <ArrowLeft className="relative z-10 w-5 h-5 stroke-[2.5] text-[var(--text-nav-inactive)] transition-transform duration-200 group-hover:-translate-x-0.5" />
      </button>
    </div>
  );
});
