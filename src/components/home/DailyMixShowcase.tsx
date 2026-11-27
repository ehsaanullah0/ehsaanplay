import React, { useMemo, useState, useId, useRef, useEffect } from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import { DailyMixPlaceholder } from './DailyMixPlaceholder';
import { resolveStateForMediaItem, normalizeMediaTitle } from '../../utils/mediaDedup';
import { getImdbRatingPageUrl } from '../../utils/imdbUrl';
import { Shuffle, Play, Star } from 'lucide-react';

interface DailyMixShowcaseProps {
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onNavigateToWatchlist?: () => void;
  onOpenSearch?: () => void;
}

type MaterialShapeKind = 'clover' | 'cookie' | 'arch' | 'gem' | 'blossom' | 'hexagon';

interface MaterialShapeSpec {
  id: MaterialShapeKind;
  name: string;
  clipPath: string; // normalized 0..1 for objectBoundingBox clipPath
  outlinePath: string; // 0..100 for decorative SVG stroke ring
  floatClass: string;
  ringAnimClass: string;
  hoverRotateClass: string;
  accentTone: 'olive' | 'yellow' | 'primary';
}

/**
 * Generates a smooth closed SVG path from polar sampling points using
 * Catmull-Rom -> cubic Bezier conversion so every Material 3 Expressive
 * organic shape has C1-continuous curvature at any DPR.
 */
function pointsToSmoothClosedPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return '';
  const fmt = (v: number) => Number(v.toFixed(4));
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

function buildPolarShape(
  scale: number,
  radiusFn: (theta: number) => number,
  samples = 48
): string {
  const half = scale / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    const r = radiusFn(theta) * scale;
    pts.push([half + r * Math.cos(theta), half + r * Math.sin(theta)]);
  }
  return pointsToSmoothClosedPath(pts);
}

function buildArchShape(scale: number): string {
  const s = (v: number) => Number((v * scale).toFixed(4));
  return [
    `M ${s(0.04)} ${s(0.47)}`,
    `C ${s(0.04)} ${s(0.18)}, ${s(0.23)} ${s(0.03)}, ${s(0.5)} ${s(0.03)}`,
    `C ${s(0.77)} ${s(0.03)}, ${s(0.96)} ${s(0.18)}, ${s(0.96)} ${s(0.47)}`,
    `L ${s(0.96)} ${s(0.81)}`,
    `C ${s(0.96)} ${s(0.92)}, ${s(0.89)} ${s(0.97)}, ${s(0.78)} ${s(0.97)}`,
    `L ${s(0.22)} ${s(0.97)}`,
    `C ${s(0.11)} ${s(0.97)}, ${s(0.04)} ${s(0.92)}, ${s(0.04)} ${s(0.81)}`,
    `Z`,
  ].join(' ');
}

function buildSoftGemShape(scale: number): string {
  const half = scale / 2;
  const samples = 48;
  const n = 2.6;
  const rScale = 0.48 * scale;
  const rot = Math.PI / 4;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const pts: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const sx = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * rScale;
    const sy = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * rScale;
    const rx = sx * cosR - sy * sinR;
    const ry = sx * sinR + sy * cosR;
    pts.push([half + rx, half + ry]);
  }
  return pointsToSmoothClosedPath(pts);
}

function buildRoundedHexagonShape(scale: number): string {
  const half = scale / 2;
  const rx = 0.48 * scale;
  const ry = 0.515 * scale;
  const vertices: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3; // flat top & flat bottom hexagon
    vertices.push([half + rx * Math.cos(angle), half + ry * Math.sin(angle)]);
  }
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = vertices[k];
    const b = vertices[(k + 1) % 6];
    const lerp = (t: number): [number, number] => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];
    pts.push(lerp(0.18), lerp(0.5), lerp(0.82));
  }
  return pointsToSmoothClosedPath(pts);
}

const MATERIAL_SHAPES: MaterialShapeSpec[] = [
  {
    id: 'clover',
    name: 'Clover',
    clipPath: buildPolarShape(1, (t) => 0.42 + 0.065 * Math.cos(4 * (t - Math.PI / 4)), 48),
    outlinePath: buildPolarShape(100, (t) => 0.42 + 0.065 * Math.cos(4 * (t - Math.PI / 4)), 48),
    floatClass: 'daily-mix-float-0',
    ringAnimClass: 'daily-mix-ring-orbit',
    hoverRotateClass: 'group-hover:rotate-[6deg]',
    accentTone: 'olive',
  },
  {
    id: 'cookie',
    name: 'Scallop',
    clipPath: buildPolarShape(1, (t) => 0.44 + 0.046 * Math.cos(8 * t), 64),
    outlinePath: buildPolarShape(100, (t) => 0.44 + 0.046 * Math.cos(8 * t), 64),
    floatClass: 'daily-mix-float-1',
    ringAnimClass: 'daily-mix-ring-orbit-reverse',
    hoverRotateClass: 'group-hover:-rotate-[7deg]',
    accentTone: 'yellow',
  },
  {
    id: 'arch',
    name: 'Arch',
    clipPath: buildArchShape(1),
    outlinePath: buildArchShape(100),
    floatClass: 'daily-mix-float-2',
    ringAnimClass: 'daily-mix-ring-pulse',
    hoverRotateClass: 'group-hover:rotate-[3deg]',
    accentTone: 'primary',
  },
  {
    id: 'gem',
    name: 'Gem',
    clipPath: buildSoftGemShape(1),
    outlinePath: buildSoftGemShape(100),
    floatClass: 'daily-mix-float-3',
    ringAnimClass: 'daily-mix-ring-pulse',
    hoverRotateClass: 'group-hover:-rotate-[5deg]',
    accentTone: 'olive',
  },
  {
    id: 'blossom',
    name: 'Blossom',
    clipPath: buildPolarShape(1, (t) => 0.43 + 0.054 * Math.cos(5 * (t - Math.PI / 2)), 60),
    outlinePath: buildPolarShape(100, (t) => 0.43 + 0.054 * Math.cos(5 * (t - Math.PI / 2)), 60),
    floatClass: 'daily-mix-float-4',
    ringAnimClass: 'daily-mix-ring-orbit',
    hoverRotateClass: 'group-hover:rotate-[6deg]',
    accentTone: 'yellow',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    clipPath: buildRoundedHexagonShape(1),
    outlinePath: buildRoundedHexagonShape(100),
    floatClass: 'daily-mix-float-5',
    ringAnimClass: 'daily-mix-ring-orbit-reverse',
    hoverRotateClass: 'group-hover:-rotate-[5deg]',
    accentTone: 'primary',
  },
];

/** Deterministic daily PRNG (Mulberry32) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getTodaySeed(salt: number): number {
  const now = new Date();
  const dateNumber = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return dateNumber * 2654435761 + salt * 1013904223;
}

function formatTodayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const DailyMixShowcase: React.FC<DailyMixShowcaseProps> = React.memo(({
  mediaItems,
  userStates,
  onSelectMedia,
  onNavigateToWatchlist,
  onOpenSearch,
}) => {
  const uniqueIdPrefix = useId().replace(/:/g, '');
  const [shuffleSalt, setShuffleSalt] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isSpinningShuffle, setIsSpinningShuffle] = useState(false);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    };
  }, []);

  const hasWatchedItems = useMemo(() => {
    return Object.values(userStates).some((st) => st?.isWatched);
  }, [userStates]);

  // Build deduplicated Watchlist pool (strictly unwatched titles in the user's watchlist)
  const watchlistPool = useMemo(() => {
    const pool: MediaItem[] = [];
    const seenKeys = new Set<string>();

    for (const item of mediaItems) {
      const state = resolveStateForMediaItem(item, userStates);
      if (!state?.inWatchlist || state.isWatched) continue;

      const normTitle = normalizeMediaTitle(item.title || '');
      const keys = [`id:${item.id}`];
      if (item.imdbId) keys.push(`imdb:${item.imdbId}`);
      if (item.tmdbId) keys.push(`tmdb:${item.type || 'movie'}:${item.tmdbId}`);
      if (normTitle) keys.push(`title:${item.type || 'movie'}:${normTitle}`);

      if (keys.some((k) => seenKeys.has(k))) continue;
      keys.forEach((k) => seenKeys.add(k));
      pool.push(item);
    }

    return pool;
  }, [mediaItems, userStates]);

  // Select up to 6 random titles from Watchlist
  const dailyPicks = useMemo(() => {
    if (watchlistPool.length === 0) return [];
    const rng = mulberry32(getTodaySeed(shuffleSalt));
    const copy = [...watchlistPool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(6, copy.length));
  }, [watchlistPool, shuffleSalt]);

  const activeShapes = useMemo(() => {
    const offset = shuffleSalt % MATERIAL_SHAPES.length;
    return dailyPicks.map((_, idx) => MATERIAL_SHAPES[(idx + offset) % MATERIAL_SHAPES.length]);
  }, [dailyPicks, shuffleSalt]);

  const todayLabel = useMemo(() => formatTodayLabel(), []);

  useEffect(() => {
    if (hoveredIdx !== null && hoveredIdx >= dailyPicks.length) {
      setHoveredIdx(null);
    }
  }, [dailyPicks.length, hoveredIdx]);

  const handleReshuffle = () => {
    if (watchlistPool.length <= 1) return;
    setIsSpinningShuffle(true);
    setHoveredIdx(null);
    setShuffleSalt((prev) => prev + 1);
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    shuffleTimerRef.current = setTimeout(() => setIsSpinningShuffle(false), 380);
  };

  return (
    <section
      aria-label="Daily Mix"
      className="mb-7 sm:mb-10 relative rounded-2xl sm:rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs overflow-hidden"
    >
      {/* Shared SVG ClipPath Definitions for Material 3 Expressive Shapes */}
      <svg
        aria-hidden="true"
        className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      >
        <defs>
          {MATERIAL_SHAPES.map((shape) => (
            <clipPath
              key={shape.id}
              id={`${uniqueIdPrefix}-clip-${shape.id}`}
              clipPathUnits="objectBoundingBox"
            >
              <path d={shape.clipPath} />
            </clipPath>
          ))}
        </defs>
      </svg>

      {/* Subtle ambient tonal backdrop wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background:
            'radial-gradient(58% 85% at 8% 0%, var(--bg-card-olive) 0%, transparent 60%), radial-gradient(48% 75% at 94% 100%, var(--bg-card-yellow) 0%, transparent 62%)',
        }}
      />

      <div className="relative z-10 px-3.5 py-3.5 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        {/* Compact Single-Line Editorial Header */}
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)] truncate">
              <span>{todayLabel}</span>
              <span aria-hidden="true">·</span>
              <span>From Watchlist</span>
              {watchlistPool.length > 0 && (
                <>
                  <span aria-hidden="true" className="hidden xs:inline">·</span>
                  <span className="hidden xs:inline tabular-nums">
                    {dailyPicks.length} of {watchlistPool.length} queued
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight text-balance">
              Daily Mix
            </h2>
          </div>

          {watchlistPool.length > 1 && (
            <button
              type="button"
              onClick={handleReshuffle}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] sm:min-h-[40px] rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 ${
                isSpinningShuffle ? 'animate-btn-pop' : ''
              }`}
              title="Shuffle a fresh Daily Mix from your Watchlist"
            >
              <Shuffle
                className={`w-3.5 h-3.5 stroke-[2.4] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isSpinningShuffle ? 'rotate-[360deg] scale-110' : ''
                }`}
              />
              <span>Remix</span>
            </button>
          )}
        </div>

        {/* Empty Watchlist Compact Illustrated Placeholder */}
        {dailyPicks.length === 0 ? (
          <DailyMixPlaceholder
            onOpenSearch={onOpenSearch}
            onNavigateToWatchlist={onNavigateToWatchlist}
            hasWatchedItems={hasWatchedItems}
          />
        ) : (
          /* Compact & Adaptive Single-Row Rail (Horizontal Snap on Small Screens, Full 6-Slot Row on Desktop) */
          <div
            className={`py-1.5 -mx-1 px-1 ${
              dailyPicks.length === 6
                ? 'flex items-start gap-2.5 sm:gap-3.5 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-6 md:gap-3 lg:gap-4 xl:gap-5'
                : `flex items-start gap-2.5 sm:gap-4 lg:gap-5 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory ${
                    dailyPicks.length <= 3 ? 'justify-center' : 'justify-start md:justify-center'
                  }`
            }`}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {dailyPicks.map((item, idx) => {
              const shape = activeShapes[idx];
              const isHovered = hoveredIdx === idx;
              const isDimmed = hoveredIdx !== null && hoveredIdx !== idx;
              const ratingVal =
                item.imdbRating && item.imdbRating > 0
                  ? item.imdbRating
                  : item.tmdbRating && item.tmdbRating > 0
                  ? item.tmdbRating
                  : 0;

              const ringStrokeColor =
                shape.accentTone === 'yellow'
                  ? 'var(--bg-card-yellow)'
                  : shape.accentTone === 'olive'
                  ? 'var(--bg-card-olive)'
                  : 'var(--accent-primary)';

              const haloBgColor =
                shape.accentTone === 'yellow'
                  ? 'var(--bg-card-yellow)'
                  : shape.accentTone === 'olive'
                  ? 'var(--bg-card-olive)'
                  : 'var(--accent-secondary)';

              const hasImdbRating = Boolean(item.imdbRating && item.imdbRating > 0);
              const tileWidthClass =
                dailyPicks.length === 6
                  ? 'shrink-0 w-[104px] xs:w-[114px] sm:w-[126px] md:w-full md:max-w-[164px] md:mx-auto'
                  : 'shrink-0 w-[104px] xs:w-[114px] sm:w-[126px] md:w-[132px] lg:w-[144px] xl:w-[156px]';

              return (
                <div
                  key={`${shuffleSalt}-${item.id}`}
                  style={{ animationDelay: `${idx * 35}ms` }}
                  className={`daily-mix-enter snap-start ${tileWidthClass} flex flex-col items-center rounded-2xl p-1 sm:p-1.5 transition-colors duration-200 ${
                    isHovered
                      ? 'relative z-30 bg-[var(--bg-surface)]/80'
                      : 'relative z-10 hover:bg-[var(--bg-surface)]/60'
                  }`}
                >
                  {/* Compact Jewel-Sized Material 3 Expressive Shape Tile */}
                  <div
                    onMouseEnter={() => setHoveredIdx(idx)}
                    className={`daily-mix-tile group relative w-full aspect-square flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      isHovered
                        ? 'scale-[1.06] -translate-y-1 z-30'
                        : isDimmed
                        ? 'opacity-75 scale-[0.97]'
                        : 'hover:scale-[1.06] hover:-translate-y-1'
                    }`}
                  >
                    {/* Soft Tonal Backdrop Halo behind each expressive shape */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-1.5 rounded-full blur-md transition-opacity duration-300 ${
                        isHovered ? 'opacity-70' : 'opacity-35'
                      }`}
                      style={{ backgroundColor: haloBgColor }}
                    />

                    <button
                      type="button"
                      onClick={() => onSelectMedia(item)}
                      onFocus={() => setHoveredIdx(idx)}
                      onBlur={() => setHoveredIdx((curr) => (curr === idx ? null : curr))}
                      aria-label={`Open ${item.title} from Daily Mix`}
                      className="relative w-full h-full flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 rounded-full"
                    >
                      <div
                        className={`relative w-full h-full flex items-center justify-center ${shape.floatClass}`}
                      >
                        {/* Orbiting / Breathing Tonal Outer Shape Ring */}
                        <svg
                          viewBox="0 0 100 100"
                          aria-hidden="true"
                          className={`pointer-events-none absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] transition-all duration-500 ${shape.ringAnimClass} ${
                            isHovered ? 'opacity-100 scale-105' : 'opacity-65'
                          }`}
                        >
                          <path
                            d={shape.outlinePath}
                            fill="none"
                            stroke={ringStrokeColor}
                            strokeWidth={isHovered ? '2.2' : '1.4'}
                            strokeDasharray={shape.id === 'cookie' || shape.id === 'clover' ? '5 3.5' : undefined}
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>

                        {/* Expressive Clipped Poster Surface */}
                        <div
                          className={`relative w-full h-full isolate transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)] group-hover:drop-shadow-[0_12px_22px_rgba(0,0,0,0.28)] ${shape.hoverRotateClass}`}
                        >
                          <div
                            className="relative w-full h-full overflow-hidden bg-[var(--bg-surface-elevated)]"
                            style={{
                              clipPath: `url(#${uniqueIdPrefix}-clip-${shape.id})`,
                              WebkitClipPath: `url(#${uniqueIdPrefix}-clip-${shape.id})`,
                            }}
                          >
                            <SafeImage
                              src={item.posterUrl || item.backdropUrl}
                              alt={item.title}
                              fallbackTitle={item.title}
                              className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                            />

                            {/* Measured bottom scrim for rating contrast */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent transition-opacity duration-200 ${
                                isHovered ? 'opacity-100' : 'opacity-50'
                              }`}
                            />

                            {/* Compact Center Hover Play Affordance */}
                            <div
                              className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                                isHovered
                                  ? 'opacity-100 scale-100'
                                  : 'opacity-0 scale-75'
                              }`}
                            >
                              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-md flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Clickable Rating Pill (Sibling outside button for valid HTML, no 'IMDb' text) */}
                    {ratingVal > 0 && (
                      <div className="absolute bottom-1 inset-x-0 z-30 flex justify-center pointer-events-none">
                        {hasImdbRating ? (
                          <a
                            href={getImdbRatingPageUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Open IMDb ratings page (${ratingVal.toFixed(1)}/10)`}
                            aria-label={`Open IMDb ratings page for ${item.title} (${ratingVal.toFixed(1)}/10)`}
                            className="pointer-events-auto inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#F5C518] hover:bg-[#E2B616] text-[#121212] text-[10px] font-black tabular-nums leading-none shadow-sm border border-[#DFB00F] transition hover:scale-105 active:scale-95"
                          >
                            <Star className="w-2.5 h-2.5 fill-[#121212] text-[#121212]" />
                            <span>{ratingVal.toFixed(1)}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-black tabular-nums leading-none shadow-xs border border-white/15 backdrop-blur-xs">
                            <Star className="w-2.5 h-2.5 fill-[#F5C518] text-[#F5C518]" />
                            <span>{ratingVal.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clean Compact 1-Line Title & Meta */}
                  <div className="mt-1.5 text-center w-full px-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectMedia(item)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      className={`block w-full text-[11.5px] sm:text-xs font-bold truncate transition-colors cursor-pointer focus:outline-none ${
                        isHovered
                          ? 'text-[var(--accent-primary)]'
                          : 'text-[var(--text-primary)] hover:text-[var(--accent-primary)]'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </button>
                    <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
                      <span className="tabular-nums">{item.year || '—'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.type === 'tv' ? 'Series' : 'Movie'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
});
