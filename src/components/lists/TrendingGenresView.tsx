import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GenreCategoryItem, AVAILABLE_GEMINI_MODELS, GenreMixBottomBarAction } from '../../types/movie';
import { GENRE_CATEGORIES } from '../../data/genreCategories';
import {
  Sparkles,
  Search,
  Key,
  Cpu,
  ArrowRight,
  Sparkle,
  Layers,
  Check,
  X,
  Shuffle,
  Clock,
  Zap,
} from 'lucide-react';

interface TrendingGenresViewProps {
  onSelectGenre: (genre: GenreCategoryItem, count?: number) => void;
  hasGeminiKey: boolean;
  selectedModel?: string;
  onUpdateModel?: (modelId: string) => void;
  onGenreMixActionChange?: (action: GenreMixBottomBarAction | null) => void;
  onNavigateToGeminiSettings?: () => void;
  onBackToShelves?: () => void;
}

const COUNT_OPTIONS = [10, 20, 30, 40, 50] as const;

export const TrendingGenresView: React.FC<TrendingGenresViewProps> = ({
  onSelectGenre,
  hasGeminiKey,
  selectedModel = 'gemini-3.1-flash-lite',
  onUpdateModel,
  onGenreMixActionChange,
  onNavigateToGeminiSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCount, setSelectedCount] = useState<number>(20);
  const [isMixMode, setIsMixMode] = useState(false);
  const [selectedMixGenreIds, setSelectedMixGenreIds] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Long press timer ref
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef<boolean>(false);

  // Human readable model name
  const modelDisplayName = useMemo(() => {
    const found = AVAILABLE_GEMINI_MODELS.find(m => m.id === selectedModel);
    return found ? found.name : selectedModel;
  }, [selectedModel]);

  const filteredGenres = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return GENRE_CATEGORIES;
    return GENRE_CATEGORIES.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.tagline.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Mix mode toggle helper
  const toggleGenreInMix = (genreId: string) => {
    setSelectedMixGenreIds(prev => {
      const exists = prev.includes(genreId);
      const next = exists ? prev.filter(id => id !== genreId) : [...prev, genreId];
      if (next.length === 0) {
        setIsMixMode(false);
      } else {
        setIsMixMode(true);
      }
      return next;
    });
  };

  // Generate Mixed Genre Curation
  const handleGenerateMixed = () => {
    if (selectedMixGenreIds.length === 0) return;

    const matchedGenres = GENRE_CATEGORIES.filter(g => selectedMixGenreIds.includes(g.id));
    if (matchedGenres.length === 1) {
      onSelectGenre(matchedGenres[0], selectedCount);
      return;
    }

    const genreNames = matchedGenres.map(g => g.name);
    let displayName = '';
    if (genreNames.length <= 2) {
      displayName = genreNames.join(' & ');
    } else {
      displayName = `${genreNames.slice(0, 2).join(' & ')} + ${genreNames.length - 2} More`;
    }

    const mixedGenreItem: GenreCategoryItem = {
      id: `mixed-${matchedGenres.map(g => g.id).sort().join('-')}`,
      name: displayName,
      subtitle: genreNames.join(' · '),
      tagline: `Multi-genre crossover (${matchedGenres.length} genres)`,
      backdropUrl: matchedGenres[0]?.backdropUrl || '',
      accentColor: matchedGenres[0]?.accentColor || '#F59E0B',
      mixedGenreNames: genreNames,
    };

    onSelectGenre(mixedGenreItem, selectedCount);
  };

  // Synchronize active mix action with the bottom navigation bar (shifting the button to the bottom bar)
  useEffect(() => {
    if (isMixMode && selectedMixGenreIds.length > 0) {
      const matchedGenres = GENRE_CATEGORIES.filter(g => selectedMixGenreIds.includes(g.id));
      onGenreMixActionChange?.({
        selectedCount,
        genreNames: matchedGenres.map(g => g.name),
        genreCount: matchedGenres.length,
        onGenerate: handleGenerateMixed,
        onClear: () => {
          setSelectedMixGenreIds([]);
          setIsMixMode(false);
        },
      });
    } else {
      onGenreMixActionChange?.(null);
    }

    return () => {
      onGenreMixActionChange?.(null);
    };
  }, [isMixMode, selectedMixGenreIds, selectedCount]);

  // Long-press handlers for mobile / touch / mouse
  const handleTouchStart = (genre: GenreCategoryItem) => {
    isLongPressTriggered.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch { /* ignore */ }
      }
      setIsMixMode(true);
      toggleGenreInMix(genre.id);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Right-click handler
  const handleContextMenu = (e: React.MouseEvent, genre: GenreCategoryItem) => {
    e.preventDefault();
    setIsMixMode(true);
    toggleGenreInMix(genre.id);
  };

  // Click handler
  const handlePillClick = (genre: GenreCategoryItem) => {
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }

    if (isMixMode) {
      toggleGenreInMix(genre.id);
    } else {
      // Direct instant generation
      onSelectGenre(genre, selectedCount);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      {/* Missing API Key Notification Banner */}
      {!hasGeminiKey && onNavigateToGeminiSettings && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Connect your Gemini API Key
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                To generate verified Top collections on-demand in &lt;10s, add your key in Settings.
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToGeminiSettings}
            className="px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Open Settings</span>
          </button>
        </div>
      )}

      {/* Top Controls Bar: Title, Count Selector, Model & Mix Mode Toggle */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Genre Curation
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Click any genre to curate in &lt;10s · Long-press or right-click to mix multiple genres.
            </p>
          </div>

          {/* Quick Model Selector Dropdown/Button */}
          <div className="relative self-start sm:self-auto">
            <button
              onClick={() => setShowModelPicker(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-medium transition cursor-pointer"
              title="Change Gemini Model"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Model: <strong className="text-[var(--text-primary)] font-bold">{modelDisplayName}</strong></span>
            </button>

            {/* Model Picker Flyout */}
            {showModelPicker && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-xl p-2 z-50 space-y-1 animate-fade-in">
                <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] px-2 py-1">
                  Select AI Model
                </div>
                {AVAILABLE_GEMINI_MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onUpdateModel?.(m.id);
                      setShowModelPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      selectedModel === m.id
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold'
                        : 'hover:bg-[var(--chip-bg)] text-[var(--text-primary)]'
                    }`}
                  >
                    <div>
                      <div>{m.name}</div>
                      <div className="text-[10px] opacity-75">{m.badge}</div>
                    </div>
                    {selectedModel === m.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Number of Titles (10, 20, 30, 40, 50) + Mix Mode Toggle + Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Title Count Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Count:
            </span>
            <div className="inline-flex rounded-full bg-[var(--chip-bg)] p-1 border border-[var(--border-subtle)]">
              {COUNT_OPTIONS.map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setSelectedCount(cnt)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedCount === cnt
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-medium">titles</span>
          </div>

          {/* Right Tools: Mix Genres Button & Search */}
          <div className="flex items-center gap-2.5">
            {/* Mix Genres Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (isMixMode) {
                  setIsMixMode(false);
                  setSelectedMixGenreIds([]);
                } else {
                  setIsMixMode(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow-3xs cursor-pointer border ${
                isMixMode
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]/40'
              }`}
              title="Mix multiple genres together by selecting two or more"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>{isMixMode ? `Mix Mode (${selectedMixGenreIds.length})` : 'Mix Genres'}</span>
            </button>

            {/* Quick Search Field */}
            <div className="relative w-40 sm:w-48">
              <Search className="w-3 h-3 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-6 py-1.5 rounded-full bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medium-Sized Text-Only Genre Pills Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs relative">
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {filteredGenres.map(genre => {
            const isSelectedInMix = selectedMixGenreIds.includes(genre.id);

            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => handlePillClick(genre)}
                onContextMenu={e => handleContextMenu(e, genre)}
                onTouchStart={() => handleTouchStart(genre)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(genre)}
                onMouseUp={handleTouchEnd}
                className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-3xs active:scale-95 select-none border flex items-center gap-2 group ${
                  isSelectedInMix
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent ring-2 ring-[var(--accent-primary)]/40 scale-105'
                    : isMixMode
                    ? 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 border-[var(--border-subtle)]'
                    : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-transparent'
                }`}
              >
                {isSelectedInMix && (
                  <span className="w-4 h-4 rounded-full bg-[var(--bg-primary)] text-[var(--accent-primary)] flex items-center justify-center font-black text-[10px]">
                    ✓
                  </span>
                )}
                <span>{genre.name}</span>
                {!isMixMode && (
                  <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>

        {filteredGenres.length === 0 && (
          <div className="py-10 text-center text-xs text-[var(--text-secondary)]">
            No genres found matching "{searchQuery}".
          </div>
        )}
      </div>

      {/* Speed & Reliability Guarantee Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)] px-1">
        <div className="flex items-center gap-2">
          <Sparkle className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <span>
            Curated in &lt;10s using {modelDisplayName} · Metadata fetched in parallel from TMDB &amp; OMDb.
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-[11px]">
          <Clock className="w-3 h-3 text-emerald-500" />
          <span>Sub-10s Target Guaranteed</span>
        </div>
      </div>
    </div>
  );
};
