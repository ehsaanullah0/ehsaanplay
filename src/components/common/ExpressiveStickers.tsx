import React from 'react';

/**
 * Material 3 Expressive Animated Vector Stickers styled after StartGuideModal.
 * Strictly theme-synced via CSS custom properties and GPU-only CSS animations.
 */

export const StickerEmptyWatchlist: React.FC<{ className?: string }> = ({
  className = 'w-44 h-36 sm:w-52 sm:h-40',
}) => (
  <svg
    viewBox="0 0 260 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    {/* Soft Organic Backdrop Blob */}
    <path
      d="M48 76 C32 34 80 14 134 20 C188 26 226 56 212 106 C198 154 156 182 102 174 C52 166 64 118 48 76 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />

    {/* Slow Orbiting Dashed Halo */}
    <circle
      cx="130"
      cy="98"
      r="72"
      stroke="var(--accent-primary)"
      strokeOpacity="0.22"
      strokeWidth="1.5"
      strokeDasharray="6 6"
      className="sticker-orbit-slow"
    />

    {/* Floating Mini Ticket Card (Top-Left) */}
    <g transform="translate(26, 46)">
      <g className="sticker-float-alt">
        <rect
          x="0"
          y="0"
          width="54"
          height="36"
          rx="10"
          transform="rotate(-10 27 18)"
          fill="var(--bg-card-olive)"
          stroke="var(--text-card-olive)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <polygon
          points="22,12 22,24 33,18"
          fill="var(--text-card-olive)"
          transform="rotate(-10 27 18)"
        />
      </g>
    </g>

    {/* Center Focal Arched Cinema Poster Card with Expressive Bookmark */}
    <g transform="translate(86, 36)">
      <g className="sticker-float-slow">
        <path
          d="M0 38 C0 15 18 0 44 0 C70 0 88 15 88 38 L88 112 C88 122 80 130 70 130 L18 130 C8 130 0 122 0 112 Z"
          fill="var(--bg-surface-card)"
          stroke="var(--text-primary)"
          strokeOpacity="0.85"
          strokeWidth="2.4"
        />
        {/* Tonal Inner Arch Fill */}
        <path
          d="M9 39 C9 21 23 9 44 9 C65 9 79 21 79 39 L79 84 L9 84 Z"
          fill="var(--accent-secondary)"
          fillOpacity="0.72"
        />
        {/* Crisp Bookmark Ribbon */}
        <path
          d="M31 28 C31 24.5 33.8 22 37 22 L51 22 C54.2 22 57 24.5 57 28 L57 68 L44 59 L31 68 Z"
          fill="var(--accent-primary)"
          stroke="var(--bg-primary)"
          strokeWidth="1.6"
        />
        <path
          d="M44 35 V45 M39 40 H49"
          stroke="var(--bg-primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Skeleton title lines */}
        <rect x="20" y="96" width="48" height="6" rx="3" fill="var(--text-primary)" fillOpacity="0.22" />
        <rect x="29" y="108" width="30" height="4.5" rx="2.2" fill="var(--text-secondary)" fillOpacity="0.22" />
      </g>
    </g>

    {/* Floating Star Pill Badge (Bottom-Right) */}
    <g transform="translate(172, 114)">
      <g className="sticker-wiggle">
        <rect
          x="0"
          y="0"
          width="56"
          height="34"
          rx="17"
          fill="var(--bg-card-yellow)"
          stroke="var(--text-card-yellow)"
          strokeOpacity="0.45"
          strokeWidth="1.6"
        />
        <path
          d="M19 10 L21.2 14.8 L26.5 15.2 L22.4 18.6 L23.7 23.8 L19 21 L14.3 23.8 L15.6 18.6 L11.5 15.2 L16.8 14.8 Z"
          fill="var(--text-card-yellow)"
        />
        <circle cx="39" cy="17" r="3" fill="var(--text-card-yellow)" fillOpacity="0.55" />
      </g>
    </g>

    {/* Twinkling Four-Point Stars */}
    <path
      d="M206 42 L209 49 L216 52 L209 55 L206 62 L203 55 L196 52 L203 49 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
    <path
      d="M48 134 L50 139 L55 141 L50 143 L48 148 L46 143 L41 141 L46 139 Z"
      fill="var(--accent-primary)"
      fillOpacity="0.75"
      className="sticker-twinkle-delay"
    />
  </svg>
);

export const StickerEmptyLists: React.FC<{ className?: string }> = ({
  className = 'w-44 h-36 sm:w-52 sm:h-40',
}) => (
  <svg
    viewBox="0 0 260 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    {/* Organic Backdrop Blob */}
    <path
      d="M52 70 C36 32 82 16 134 22 C186 28 220 58 206 108 C192 156 148 180 96 172 C48 164 68 108 52 70 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />

    {/* Back Shelf Card (Yellow) */}
    <g transform="translate(52, 42)">
      <g className="sticker-float-alt">
        <rect
          x="0"
          y="0"
          width="104"
          height="72"
          rx="16"
          transform="rotate(-9 52 36)"
          fill="var(--bg-card-yellow)"
          stroke="var(--text-card-yellow)"
          strokeOpacity="0.35"
          strokeWidth="1.8"
        />
      </g>
    </g>

    {/* Middle Shelf Card (Olive) */}
    <g transform="translate(104, 44)">
      <g className="sticker-wiggle">
        <rect
          x="0"
          y="0"
          width="104"
          height="72"
          rx="16"
          transform="rotate(8 52 36)"
          fill="var(--bg-card-olive)"
          stroke="var(--text-card-olive)"
          strokeOpacity="0.35"
          strokeWidth="1.8"
        />
      </g>
    </g>

    {/* Front Focal Shelf Card */}
    <g transform="translate(66, 62)">
      <g className="sticker-float-slow">
        <rect
          x="0"
          y="0"
          width="128"
          height="94"
          rx="20"
          fill="var(--bg-surface-card)"
          stroke="var(--text-primary)"
          strokeOpacity="0.86"
          strokeWidth="2.4"
        />
        {/* Color Tag Pill */}
        <rect x="18" y="20" width="44" height="10" rx="5" fill="var(--accent-primary)" />
        {/* Mini Shelf Item Rows */}
        <rect x="18" y="42" width="92" height="10" rx="5" fill="var(--bg-surface-elevated)" />
        <rect x="18" y="60" width="66" height="10" rx="5" fill="var(--bg-surface-elevated)" />
        {/* Floating Circular Plus Badge */}
        <circle cx="106" cy="72" r="18" fill="var(--accent-secondary)" stroke="var(--accent-secondary-text)" strokeWidth="2" />
        <path d="M106 64 V80 M98 72 H114" stroke="var(--accent-secondary-text)" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </g>

    {/* Twinkling Sparkles */}
    <path
      d="M214 38 L217 45 L224 48 L217 51 L214 58 L211 51 L204 48 L211 45 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
    <path
      d="M42 136 L44 141 L49 143 L44 145 L42 150 L40 145 L35 143 L40 141 Z"
      fill="var(--accent-primary)"
      fillOpacity="0.72"
      className="sticker-twinkle-delay"
    />
  </svg>
);

export const StickerEmptySearch: React.FC<{ className?: string }> = ({
  className = 'w-40 h-32 sm:w-44 sm:h-36',
}) => (
  <svg
    viewBox="0 0 240 190"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    <path
      d="M44 74 C28 34 74 16 124 20 C174 24 210 54 196 102 C182 150 142 174 92 166 C44 158 60 112 44 74 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />

    {/* Tilted Movie Strip Card */}
    <g transform="translate(48, 52)">
      <g className="sticker-float-alt">
        <rect
          x="0"
          y="0"
          width="88"
          height="72"
          rx="14"
          transform="rotate(-8 44 36)"
          fill="var(--bg-surface-card)"
          stroke="var(--text-primary)"
          strokeOpacity="0.8"
          strokeWidth="2.2"
        />
        <rect x="14" y="16" width="60" height="26" rx="6" transform="rotate(-8 44 36)" fill="var(--bg-card-olive)" fillOpacity="0.7" />
        <rect x="14" y="50" width="38" height="6" rx="3" transform="rotate(-8 44 36)" fill="var(--text-secondary)" fillOpacity="0.28" />
      </g>
    </g>

    {/* Expressive Magnifying Lens */}
    <g transform="translate(104, 48)">
      <g className="sticker-float-slow">
        <circle
          cx="38"
          cy="38"
          r="30"
          fill="var(--bg-card-yellow)"
          fillOpacity="0.88"
          stroke="var(--accent-primary)"
          strokeWidth="5"
        />
        <path d="M26 28 C30 22 38 20 46 22" stroke="var(--bg-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line
          x1="60"
          y1="60"
          x2="82"
          y2="82"
          stroke="var(--accent-primary)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </g>

    <path
      d="M190 36 L193 43 L200 46 L193 49 L190 56 L187 49 L180 46 L187 43 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
    <circle cx="52" cy="144" r="3.5" fill="var(--accent-primary)" fillOpacity="0.55" className="sticker-breathe" />
  </svg>
);

export const StickerImdbReady: React.FC<{ className?: string }> = ({
  className = 'w-44 h-36 sm:w-48 sm:h-40',
}) => (
  <svg
    viewBox="0 0 240 190"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    <path
      d="M44 74 C28 34 74 16 124 20 C174 24 210 54 196 102 C182 150 142 174 92 166 C44 158 60 112 44 74 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />

    {/* Clapperboard Base */}
    <g transform="translate(64, 44)">
      <g className="sticker-float-slow">
        <g transform="rotate(-10 12 20)">
          <rect x="0" y="6" width="84" height="16" rx="5" fill="var(--accent-primary)" />
          <line x1="18" y1="6" x2="25" y2="22" stroke="var(--bg-primary)" strokeWidth="3" />
          <line x1="36" y1="6" x2="43" y2="22" stroke="var(--bg-primary)" strokeWidth="3" />
          <line x1="54" y1="6" x2="61" y2="22" stroke="var(--bg-primary)" strokeWidth="3" />
        </g>
        <rect
          x="2"
          y="28"
          width="84"
          height="60"
          rx="12"
          fill="var(--bg-surface-card)"
          stroke="var(--text-primary)"
          strokeWidth="2.4"
        />
        <polygon points="36,46 36,68 56,57" fill="var(--accent-primary)" />
      </g>
    </g>

    {/* Golden IMDb Rating Pill Badge */}
    <g transform="translate(136, 98)">
      <g className="sticker-wiggle">
        <rect
          x="0"
          y="0"
          width="74"
          height="36"
          rx="14"
          fill="#F5C518"
          stroke="#121212"
          strokeWidth="1.8"
        />
        <path
          d="M20 11 L22.2 15.8 L27.5 16.2 L23.4 19.6 L24.7 24.8 L20 22 L15.3 24.8 L16.6 19.6 L12.5 16.2 L17.8 15.8 Z"
          fill="#121212"
        />
        <text
          x="34"
          y="22.5"
          fontFamily="sans-serif"
          fontSize="12"
          fontWeight="900"
          fill="#121212"
        >
          IMDb
        </text>
      </g>
    </g>

    <path
      d="M188 38 L191 45 L198 48 L191 51 L188 58 L185 51 L178 48 L185 45 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
    <path
      d="M44 128 L46 133 L51 135 L46 137 L44 142 L42 137 L37 135 L42 133 Z"
      fill="var(--accent-primary)"
      fillOpacity="0.7"
      className="sticker-twinkle-delay"
    />
  </svg>
);

export const StickerHomeAllHidden: React.FC<{ className?: string }> = ({
  className = 'w-40 h-32 sm:w-44 sm:h-36',
}) => (
  <svg
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    <path
      d="M44 70 C30 34 74 16 122 20 C170 24 206 52 192 98 C178 144 140 166 92 158 C46 150 58 106 44 70 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />
    {/* Dashboard Layout Tiles */}
    <g transform="translate(56, 40)">
      <g className="sticker-float-slow">
        <rect x="0" y="0" width="128" height="92" rx="18" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="2.2" />
        <rect x="14" y="16" width="54" height="28" rx="8" fill="var(--bg-card-olive)" />
        <rect x="74" y="16" width="40" height="28" rx="8" fill="var(--bg-card-yellow)" />
        <rect x="14" y="52" width="100" height="24" rx="8" fill="var(--accent-secondary)" fillOpacity="0.75" />
      </g>
    </g>
    {/* Floating Switch Toggle */}
    <g transform="translate(148, 108)">
      <g className="sticker-wiggle">
        <rect x="0" y="0" width="52" height="28" rx="14" fill="var(--accent-primary)" />
        <circle cx="38" cy="14" r="10" fill="var(--bg-primary)" />
      </g>
    </g>
    <path
      d="M46 42 L48 48 L54 50 L48 52 L46 58 L44 52 L38 50 L44 48 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
  </svg>
);

export const StickerExploreCaughtUp: React.FC<{ className?: string }> = ({
  className = 'w-40 h-32 sm:w-44 sm:h-36',
}) => (
  <svg
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    <path
      d="M46 72 C32 34 76 16 124 20 C172 24 208 52 194 98 C180 144 142 166 94 158 C48 150 60 108 46 72 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />
    <g transform="translate(76, 44)">
      <g className="sticker-float-slow">
        <circle cx="44" cy="44" r="42" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="2.4" />
        <circle cx="44" cy="44" r="28" fill="var(--bg-card-olive)" fillOpacity="0.75" />
        <path d="M32 45 L41 54 L58 35" stroke="var(--accent-primary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
    <g transform="translate(158, 34)">
      <g className="sticker-wiggle">
        <circle cx="18" cy="18" r="16" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M18 9 L20.2 14.5 L26 15 L21.5 18.8 L22.8 24.5 L18 21.5 L13.2 24.5 L14.5 18.8 L10 15 L15.8 14.5 Z" fill="var(--text-card-yellow)" />
      </g>
    </g>
    <path
      d="M52 118 L54.5 124 L60 126.5 L54.5 129 L52 135 L49.5 129 L44 126.5 L49.5 124 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
  </svg>
);

export const StickerEmptyCredits: React.FC<{ className?: string }> = ({
  className = 'w-36 h-28 sm:w-40 sm:h-32',
}) => (
  <svg
    viewBox="0 0 220 170"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`${className} drop-shadow-sm overflow-visible select-none`}
  >
    <path
      d="M42 66 C28 32 70 14 114 18 C158 22 192 48 178 92 C164 134 128 156 84 148 C42 140 56 100 42 66 Z"
      fill="var(--bg-card-olive)"
      fillOpacity="0.72"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
    />
    <g transform="translate(60, 38)">
      <g className="sticker-float-slow">
        <rect x="0" y="0" width="100" height="84" rx="18" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="2.2" />
        <line x1="20" y1="28" x2="80" y2="28" stroke="var(--accent-primary)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="38" cy="28" r="6" fill="var(--bg-card-yellow)" stroke="var(--accent-primary)" strokeWidth="2.5" />
        <line x1="20" y1="54" x2="80" y2="54" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="64" cy="54" r="6" fill="var(--accent-secondary)" stroke="var(--text-primary)" strokeWidth="2.5" />
      </g>
    </g>
    <path
      d="M174 34 L176 40 L182 42 L176 44 L174 50 L172 44 L166 42 L172 40 Z"
      fill="var(--accent-primary)"
      className="sticker-twinkle"
    />
  </svg>
);
