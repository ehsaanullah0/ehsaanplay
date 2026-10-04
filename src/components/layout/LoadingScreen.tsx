import React from 'react';

interface LoadingScreenProps {
  message?: string;
  onEnter?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Entering Cinema...',
  onEnter,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#F6F4E5] text-[#282C1B] flex flex-col items-center justify-center px-6 sm:px-8 py-12 select-none animate-fade-in">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center text-center space-y-6">
        {/* Aesthetic Line Art Cinema Logo / Clapperboard */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-[#282C1B] transition-transform duration-300 hover:scale-105">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full stroke-[#282C1B] stroke-[2.5]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Top angled clapper stick */}
            <g transform="rotate(-6 32 20)">
              <rect x="8" y="10" width="48" height="11" rx="3.5" fill="#EAE5D8" />
              <line x1="18" y1="10" x2="22" y2="21" />
              <line x1="28" y1="10" x2="32" y2="21" />
              <line x1="38" y1="10" x2="42" y2="21" />
              <line x1="48" y1="10" x2="52" y2="21" />
            </g>

            {/* Main Clapper Body */}
            <rect x="8" y="24" width="48" height="32" rx="6" fill="#F6F4E5" />

            {/* Centered Play Mark */}
            <polygon
              points="28,34 28,46 40,40"
              fill="#4E562F"
              stroke="#4E562F"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Brand App Name */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#282C1B] tracking-tight font-sans">
            EHSAAN PLAY
          </h1>
        </div>

        {/* Aesthetic Description Paragraph */}
        <p className="text-sm sm:text-base text-[#494E38] font-medium leading-relaxed max-w-xs sm:max-w-sm px-2">
          Your personal cinematic sanctuary. Track watch progress, curate custom lists, and explore timeless cinema without distractions.
        </p>

        {/* Themed Aesthetic Pill Button / Indicator */}
        <div className="pt-2">
          <button
            onClick={onEnter}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#4E562F] hover:bg-[#3E4524] text-[#FAF8F2] text-sm sm:text-base font-bold tracking-wide shadow-sm transition-all duration-200 active:scale-95 cursor-default"
          >
            <span className="w-2 h-2 rounded-full bg-[#E4EAB8] animate-ping" />
            <span>{message}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
