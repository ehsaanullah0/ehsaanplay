import React from 'react';
import { FilterState, SortOption, FilterStatus } from '../../types/movie';
import { X, RotateCcw } from 'lucide-react';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onUpdateFilters: (partial: Partial<FilterState>) => void;
  onResetFilters: () => void;
  availableGenres: string[];
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  availableGenres,
}) => {
  if (!isOpen) return null;

  const statuses: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'All Library' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'watched', label: 'Watched' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'favorites', label: 'Favorites' },
  ];

  const types: { id: 'all' | 'movie' | 'tv'; label: string }[] = [
    { id: 'all', label: 'All Formats' },
    { id: 'movie', label: 'Movies Only' },
    { id: 'tv', label: 'TV Series Only' },
  ];

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'recent', label: 'Recently Added' },
    { id: 'rating_desc', label: 'Highest Rated' },
    { id: 'rating_asc', label: 'Lowest Rated' },
    { id: 'year_desc', label: 'Release Date (Newest)' },
    { id: 'year_asc', label: 'Release Date (Oldest)' },
    { id: 'title_asc', label: 'Title (A-Z)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--modal-bg)] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] z-10 animate-slide-up">
        {/* Drag Handle Indicator (mobile) */}
        <div className="sm:hidden w-12 h-1 bg-[var(--accent-primary)]/20 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Filter & Sort
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Customise your shelf view</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--chip-bg)] hover:opacity-85 text-[var(--text-primary)] transition focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statuses.map(st => {
                const isSelected = filters.status === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => onUpdateFilters({ status: st.id })}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                        : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:opacity-85'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
              Format
            </label>
            <div className="flex flex-wrap gap-2">
              {types.map(t => {
                const isSelected = filters.type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onUpdateFilters({ type: t.id })}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                        : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:opacity-85'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
              Sort By
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sortOptions.map(sort => {
                const isSelected = filters.sortBy === sort.id;
                return (
                  <button
                    key={sort.id}
                    onClick={() => onUpdateFilters({ sortBy: sort.id })}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                        : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:opacity-85'
                    }`}
                  >
                    {sort.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genre Filter */}
          {availableGenres.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                Genre
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                <button
                  onClick={() => onUpdateFilters({ genre: 'all' })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    filters.genre === 'all'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                      : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:opacity-85'
                  }`}
                >
                  All Genres
                </button>
                {availableGenres.map(genre => {
                  const isSelected = filters.genre === genre;
                  return (
                    <button
                      key={genre}
                      onClick={() => onUpdateFilters({ genre })}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        isSelected
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                          : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:opacity-85'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
