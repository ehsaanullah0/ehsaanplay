import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value?: number; // 0 to 10
  onChange: (rating: number) => void;
  max?: number;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'inline' | 'stacked';
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  max = 10,
  readOnly = false,
  size = 'md',
  layout = 'stacked',
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const starSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5 sm:w-6 sm:h-6',
    lg: 'w-7 h-7 sm:w-8 sm:h-8',
  }[size];

  const currentVal = hovered !== null ? hovered : value;

  return (
    <div className={`flex ${layout === 'stacked' ? 'flex-col items-start gap-1' : 'items-center gap-2 flex-wrap'}`}>
      <div className="flex items-center gap-0.5 sm:gap-1">
        {Array.from({ length: max }, (_, i) => {
          const score = i + 1;
          const isFilled = score <= currentVal;

          return (
            <button
              key={score}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(score === value ? 0 : score)}
              onMouseEnter={() => !readOnly && setHovered(score)}
              onMouseLeave={() => !readOnly && setHovered(null)}
              className={`p-0.5 rounded transition-transform ${
                readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
              } focus:outline-none`}
              aria-label={`Rate ${score} of ${max}`}
            >
              <Star
                className={`${starSize} transition-colors ${
                  isFilled
                    ? 'fill-[#4E562F] text-[#4E562F]'
                    : 'text-[#C5C9B3] hover:text-[#8E9672]'
                }`}
              />
            </button>
          );
        })}
      </div>

      <span className="text-sm font-bold text-[#282C1B] tabular-nums">
        {currentVal > 0 ? `${currentVal} / ${max}` : 'Unrated'}
      </span>
    </div>
  );
};
