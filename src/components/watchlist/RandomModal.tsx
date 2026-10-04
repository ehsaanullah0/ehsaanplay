import React from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import { Sparkles, X, Star, ArrowRight, RotateCw } from 'lucide-react';

interface RandomModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onPickAnother: () => void;
  userState?: PersonalMediaState;
}

export const RandomModal: React.FC<RandomModalProps> = ({
  item,
  isOpen,
  onClose,
  onSelectMedia,
  onPickAnother,
  userState,
}) => {
  if (!isOpen || !item) return null;

  const rating = userState?.personalRating || item.tmdbRating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--modal-bg)] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] z-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[var(--chip-bg)] hover:opacity-85 text-[var(--text-primary)] transition focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header Badge */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-primary)] mb-4">
          <Sparkles className="w-4 h-4" />
          <span>Your Random Pick</span>
        </div>

        {/* Poster & Title Container */}
        <div className="flex gap-4 sm:gap-5 mb-5">
          <div className="w-24 sm:w-28 flex-none aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-surface-elevated)] shadow-md">
            <SafeImage
              src={item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] leading-tight">
              {item.title}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span>{item.year}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
              {rating > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent-primary)]">
                    <Star className="w-3 h-3 fill-current text-[var(--accent-secondary)]" />
                    {rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>
            {item.genres.length > 0 && (
              <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-1">
                {item.genres.slice(0, 2).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Synopsis snippet */}
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-6 bg-[var(--modal-subtle)] p-3.5 rounded-2xl">
          {item.overview}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPickAnother}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] text-xs font-bold transition shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Shuffle Again</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onSelectMedia(item);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-[var(--bg-primary)] text-xs font-bold transition shadow-xs"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
