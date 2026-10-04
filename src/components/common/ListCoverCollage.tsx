import React from 'react';
import { MediaItem } from '../../types/movie';
import { SafeImage } from './SafeImage';
import { Layers } from 'lucide-react';

interface ListCoverCollageProps {
  items: MediaItem[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ListCoverCollage: React.FC<ListCoverCollageProps> = ({
  items,
  className = '',
  size = 'md',
}) => {
  const posters = items.map(i => i.posterUrl).filter(Boolean).slice(0, 4);

  const sizeClasses = {
    sm: 'w-16 h-16 rounded-xl',
    md: 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl',
    lg: 'w-40 h-40 sm:w-56 sm:h-56 rounded-3xl',
  }[size];

  // 0 items: Empty shelf state
  if (posters.length === 0) {
    return (
      <div
        className={`relative aspect-square flex items-center justify-center bg-[#E5E2D5] text-[#4E562F] overflow-hidden shadow-xs ${sizeClasses} ${className}`}
      >
        <Layers className="w-8 h-8 opacity-40 stroke-[1.5]" />
      </div>
    );
  }

  // 1 item: Full single poster cover
  if (posters.length === 1) {
    return (
      <div
        className={`relative aspect-square overflow-hidden bg-[#E5E2D5] shadow-xs ${sizeClasses} ${className}`}
      >
        <SafeImage
          src={posters[0]}
          alt="List Cover"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 2 items: Vertical split
  if (posters.length === 2) {
    return (
      <div
        className={`relative aspect-square grid grid-cols-2 overflow-hidden bg-[#E5E2D5] shadow-xs ${sizeClasses} ${className}`}
      >
        <SafeImage
          src={posters[0]}
          alt="Cover 1"
          className="w-full h-full object-cover"
        />
        <SafeImage
          src={posters[1]}
          alt="Cover 2"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 3 items: 1 big on left, 2 stacked on right
  if (posters.length === 3) {
    return (
      <div
        className={`relative aspect-square grid grid-cols-2 overflow-hidden bg-[#E5E2D5] shadow-xs ${sizeClasses} ${className}`}
      >
        <div className="h-full">
          <SafeImage
            src={posters[0]}
            alt="Cover 1"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-rows-2 h-full">
          <SafeImage
            src={posters[1]}
            alt="Cover 2"
            className="w-full h-full object-cover"
          />
          <SafeImage
            src={posters[2]}
            alt="Cover 3"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  // 4+ items: 2x2 grid
  return (
    <div
      className={`relative aspect-square grid grid-cols-2 grid-rows-2 overflow-hidden bg-[#E5E2D5] shadow-xs ${sizeClasses} ${className}`}
    >
      {posters.map((poster, idx) => (
        <div key={idx} className="relative w-full h-full overflow-hidden">
          <SafeImage
            src={poster}
            alt={`Cover ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
};
