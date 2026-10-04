import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MediaItem, MediaType, PersonalMediaState } from '../../types/movie';
import { searchTMDB } from '../../services/tmdb';
import { Search, X, Star, Loader2, Plus, Check, Bookmark } from 'lucide-react';
import { SafeImage } from '../common/SafeImage';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  localMediaItems: MediaItem[];
  tmdbApiKey?: string;
  onAddMediaToLibrary: (item: MediaItem) => void;
  userStates?: Record<string, PersonalMediaState>;
  onToggleWatchlist?: (id: string) => void;
  onToggleWatched?: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  localMediaItems,
  tmdbApiKey,
  onAddMediaToLibrary,
  userStates = {},
  onToggleWatchlist,
  onToggleWatched,
}) => {
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | MediaType>('all');
  const [remoteResults, setRemoteResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setRemoteResults([]);
    }
  }, [isOpen]);

  // Live search handler with fast debounce
  useEffect(() => {
    if (!query.trim()) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchTMDB(query, tmdbApiKey);
        setRemoteResults(res || []);
      } catch {
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, tmdbApiKey]);

  // Combined and deduplicated results
  const searchResults = useMemo(() => {
    if (!query.trim()) return localMediaItems.slice(0, 8); // Initial Suggestions

    const lower = query.toLowerCase().trim();
    const localMatches = localMediaItems.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        item.originalTitle.toLowerCase().includes(lower) ||
        (item.genres || []).some(g => g.toLowerCase().includes(lower)) ||
        (item.cast || []).some(c => c.name.toLowerCase().includes(lower))
    );

    // Merge remote TMDB results with local matches
    const merged = [...localMatches];
    for (const rem of remoteResults) {
      if (!merged.some(m => m.id === rem.id || m.title.toLowerCase() === rem.title.toLowerCase())) {
        merged.push(rem);
      }
    }

    return merged.filter(item => {
      if (formatFilter === 'all') return true;
      return item.type === formatFilter;
    });
  }, [query, localMediaItems, remoteResults, formatFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 pt-12 sm:pt-20 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] z-10 overflow-hidden flex flex-col max-h-[84vh]">
        {/* Search Input Bar with Custom Colored Search Icon */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-[var(--modal-bg)]">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-[var(--accent-primary)] stroke-[2.5] animate-spin flex-none" />
          ) : (
            <Search className="w-5 h-5 text-[var(--accent-primary)] stroke-[2.5] flex-none" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search TMDB movies, TV series, actors, directors..."
            className="w-full bg-transparent text-base sm:text-lg font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] transition focus:outline-none text-xs font-bold px-3 shadow-3xs"
          >
            Esc
          </button>
        </div>

        {/* Format Selector Pills & Diagnostic status */}
        <div className="px-5 py-2.5 bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                formatFilter === 'all'
                  ? 'bg-[#624B15] text-[#FEDB99] shadow-xs'
                  : 'text-[#624B15]/75 hover:text-[#624B15]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFormatFilter('movie')}
              className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                formatFilter === 'movie'
                  ? 'bg-[#624B15] text-[#FEDB99] shadow-xs'
                  : 'text-[#624B15]/75 hover:text-[#624B15]'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => setFormatFilter('tv')}
              className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                formatFilter === 'tv'
                  ? 'bg-[#624B15] text-[#FEDB99] shadow-xs'
                  : 'text-[#624B15]/75 hover:text-[#624B15]'
              }`}
            >
              Series
            </button>
          </div>

          <div className="flex items-center gap-2 text-[#624B15] tabular-nums font-bold text-xs">
            {isSearching ? (
              <span className="text-[#624B15] flex items-center gap-1">
                Searching TMDB...
              </span>
            ) : (
              <span>{searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}</span>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {!query.trim() && (
            <div className="text-xs font-bold uppercase tracking-widest text-[#6A7056] px-1 mb-2">
              Featured in Library
            </div>
          )}

          {searchResults.map(item => {
            const state = userStates[item.id];
            const inWatchlist = state?.inWatchlist;
            const isWatched = state?.isWatched;
            const isWatching = !isWatched && (state?.progressPercent || 0) > 0;

            return (
              <div
                key={item.id}
                onClick={() => {
                  onAddMediaToLibrary(item);
                  onSelectMedia(item);
                  onClose();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onAddMediaToLibrary(item);
                    onSelectMedia(item);
                    onClose();
                  }
                }}
                className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-surface-card)] hover:opacity-90 transition cursor-pointer text-left focus:outline-none border border-[var(--border-subtle)] group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-16 flex-none rounded-xl overflow-hidden bg-[var(--bg-surface-elevated)] shadow-xs">
                    <SafeImage
                      src={item.posterUrl}
                      alt={item.title}
                      fallbackTitle={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-0.5">
                      <span>{item.year || '2025'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
                      {item.tmdbRating > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent-primary)]">
                            <Star className="w-3 h-3 fill-current text-[var(--accent-secondary)]" />
                            {item.tmdbRating.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* MAX 2 GENRES IN SEARCH TITLES */}
                    {item.genres && item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.genres.slice(0, 2).map(g => (
                          <span
                            key={g}
                            className="px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-[10px] font-bold"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Quick Action Buttons (Plus & Tick Icons) */}
                <div className="flex items-center gap-1.5 flex-none pl-2" onClick={e => e.stopPropagation()}>
                  {/* Plus / Watchlist Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onAddMediaToLibrary(item);
                      if (onToggleWatchlist) onToggleWatchlist(item.id);
                    }}
                    aria-label={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 shadow-2xs ${
                      inWatchlist
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--chip-bg)] hover:opacity-90 text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {inWatchlist ? (
                      <Bookmark className="w-4 h-4 fill-current" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </button>

                  {/* Tick / Mark Watched / Watching Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onAddMediaToLibrary(item);
                      if (onToggleWatched) onToggleWatched(item.id);
                    }}
                    aria-label={isWatched ? 'Watched' : isWatching ? 'Watching' : 'Mark Watched'}
                    title={isWatched ? 'Watched (click to cycle)' : isWatching ? 'Watching (click to mark watched)' : 'Mark Watched'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 shadow-2xs ${
                      isWatched
                        ? 'bg-[#E4EAB8] text-[#3B421E]'
                        : isWatching
                        ? 'bg-[#FAF8F2] text-[#4E562F] border-2 border-[#4E562F]'
                        : 'bg-[#FAF8F2] hover:bg-[#EFECE1] text-[#282C1B] border border-[#4E562F]/15'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}

          {!isSearching && searchResults.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-sm font-semibold text-[#282C1B]">
                No matching movies or series found.
              </p>
              <p className="text-xs text-[#6A7056] mt-1">
                Try searching for another movie title, actor, or genre.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
