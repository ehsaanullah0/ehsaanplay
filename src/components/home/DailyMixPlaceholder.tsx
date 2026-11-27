import React from 'react';
import { Search, ArrowUpRight, Bookmark } from 'lucide-react';

interface DailyMixPlaceholderProps {
  onOpenSearch?: () => void;
  onNavigateToWatchlist?: () => void;
  hasWatchedItems?: boolean;
}

/**
 * Compact, theme-adaptive illustrated empty state for the Home Daily Mix section
 * when no unwatched titles are queued in the Watchlist.
 */
export const DailyMixPlaceholder: React.FC<DailyMixPlaceholderProps> = React.memo(({
  onOpenSearch,
  onNavigateToWatchlist,
  hasWatchedItems = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative rounded-2xl bg-[var(--bg-surface)]/70 border border-[var(--border-subtle)] px-4 py-4 sm:px-6 sm:py-5 overflow-hidden"
    >
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Compact Subtle Material 3 Expressive Shapes Illustration */}
        <div
          aria-hidden="true"
          className="relative w-[170px] sm:w-[210px] aspect-[5/3] shrink-0 select-none flex items-center justify-center"
        >
          <svg
            viewBox="0 0 320 192"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
          >
            {/* Soft ambient ground horizon line */}
            <line
              x1="28"
              y1="168"
              x2="292"
              y2="168"
              stroke="var(--border-subtle)"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <line
              x1="76"
              y1="176"
              x2="244"
              y2="176"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray="3 5"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* 1. Far-Left Ghost 4-Leaf Clover Silhouette */}
            <g className="daily-mix-float-0" style={{ transformOrigin: '58px 104px' }}>
              <path
                d="M58 68 C70 68, 76 74, 76 86 C88 86, 94 92, 94 104 C94 116, 88 122, 76 122 C76 134, 70 140, 58 140 C46 140, 40 134, 40 122 C28 122, 22 116, 22 104 C22 92, 28 86, 40 86 C40 74, 46 68, 58 68 Z"
                fill="var(--bg-card-olive)"
                fillOpacity="0.45"
                stroke="var(--accent-primary)"
                strokeOpacity="0.32"
                strokeWidth="1.4"
                strokeDasharray="4 4"
              />
              <rect
                x="49"
                y="95"
                width="18"
                height="18"
                rx="4.5"
                stroke="var(--text-card-olive)"
                strokeOpacity="0.45"
                strokeWidth="1.25"
              />
              <path
                d="M56 101 L61 104 L56 107 Z"
                fill="var(--text-card-olive)"
                fillOpacity="0.5"
              />
            </g>

            {/* 2. Top-Right Ghost Scallop Cookie Silhouette */}
            <g className="daily-mix-float-1" style={{ transformOrigin: '254px 72px' }}>
              <path
                d="M254 40 C260 40, 263 45, 269 47 C275 49, 280 47, 284 52 C288 57, 285 62, 287 68 C289 74, 294 77, 292 83 C290 89, 285 90, 283 96 C281 102, 282 108, 276 111 C271 114, 266 110, 260 112 C254 114, 250 118, 244 115 C239 112, 239 106, 234 102 C229 98, 223 99, 220 93 C218 87, 222 83, 221 77 C220 71, 216 66, 219 60 C222 55, 228 56, 232 52 C236 47, 237 41, 243 40 C248 39, 250 40, 254 40 Z"
                fill="var(--bg-card-yellow)"
                fillOpacity="0.48"
                stroke="var(--text-card-yellow)"
                strokeOpacity="0.28"
                strokeWidth="1.35"
              />
              <circle
                cx="254"
                cy="77"
                r="10"
                stroke="var(--text-card-yellow)"
                strokeOpacity="0.42"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </g>

            {/* 3. Bottom-Right Soft Cushion Gem Silhouette */}
            <g className="daily-mix-float-3" style={{ transformOrigin: '246px 136px' }}>
              <rect
                x="227"
                y="117"
                width="38"
                height="38"
                rx="12"
                transform="rotate(45 246 136)"
                fill="var(--bg-surface-elevated)"
                stroke="var(--accent-primary)"
                strokeOpacity="0.3"
                strokeWidth="1.35"
              />
              <circle
                cx="246"
                cy="136"
                r="4"
                fill="var(--accent-primary)"
                fillOpacity="0.35"
              />
            </g>

            {/* 4. Subtle Floating Accent Marks */}
            <g opacity="0.55">
              <path
                d="M104 42 V50 M100 46 H108"
                stroke="var(--accent-primary)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <circle
                cx="210"
                cy="36"
                r="3"
                stroke="var(--accent-primary)"
                strokeWidth="1.3"
              />
              <circle
                cx="96"
                cy="148"
                r="2.5"
                fill="var(--accent-primary)"
                fillOpacity="0.45"
              />
            </g>

            {/* 5. Center Focal Material 3 Expressive Arch Card */}
            <g className="daily-mix-float-2" style={{ transformOrigin: '160px 96px' }}>
              <path
                d="M114 82 C114 52, 134 32, 160 32 C186 32, 206 52, 206 82 L206 142 C206 151, 199 158, 190 158 L130 158 C121 158, 114 151, 114 142 Z"
                fill="none"
                stroke="var(--accent-primary)"
                strokeOpacity="0.28"
                strokeWidth="1.4"
                strokeDasharray="5 4"
                className="daily-mix-ring-pulse"
                style={{ transformOrigin: '160px 96px' }}
              />

              <path
                d="M121 84 C121 58, 138 40, 160 40 C182 40, 199 58, 199 84 L199 138 C199 145, 193 151, 186 151 L134 151 C127 151, 121 145, 121 138 Z"
                fill="var(--bg-surface-card)"
                stroke="var(--border-subtle)"
                strokeWidth="1.5"
              />

              <path
                d="M128 86 C128 65, 142 49, 160 49 C178 49, 192 65, 192 86 L192 114 L128 114 Z"
                fill="var(--bg-card-olive)"
                fillOpacity="0.58"
              />

              <path
                d="M150 69 C150 66.8, 151.8 65, 154 65 L166 65 C168.2 65, 170 66.8, 170 69 L170 97 L160 90.5 L150 97 Z"
                fill="var(--accent-primary)"
                fillOpacity="0.92"
              />
              <path
                d="M160 73.5 V81.5 M156 77.5 H164"
                stroke="var(--bg-primary)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <rect
                x="138"
                y="124"
                width="44"
                height="5"
                rx="2.5"
                fill="var(--text-primary)"
                fillOpacity="0.24"
              />
              <rect
                x="146"
                y="134"
                width="28"
                height="4"
                rx="2"
                fill="var(--text-secondary)"
                fillOpacity="0.22"
              />
            </g>
          </svg>
        </div>

        {/* Clean Compact Editorial Copy & Wired Actions */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            <Bookmark className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2]" />
            <span>{hasWatchedItems ? 'All Caught Up' : 'Watchlist Empty'}</span>
          </div>

          <h3 className="mt-1 text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight text-balance">
            {hasWatchedItems
              ? 'Queue fresh titles for tomorrow’s mix'
              : 'Your Daily Mix is ready to bloom'}
          </h3>

          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto sm:mx-0">
            {hasWatchedItems
              ? 'Bookmark unwatched movies or series to your Watchlist for six daily animated picks.'
              : 'Save unwatched titles to your Watchlist to unlock six daily picks in Material shapes.'}
          </p>

          {(onOpenSearch || onNavigateToWatchlist) && (
            <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
                >
                  <Search className="w-3.5 h-3.5 stroke-[2.4]" />
                  <span>Find Titles</span>
                </button>
              )}

              {onNavigateToWatchlist && (
                <button
                  type="button"
                  onClick={onNavigateToWatchlist}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
                >
                  <span>Open Watchlist</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
