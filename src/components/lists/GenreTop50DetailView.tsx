import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  GenreCategoryItem,
  MediaItem,
  PersonalMediaState,
  CachedGenreCollection,
  AVAILABLE_GEMINI_MODELS,
  CustomList,
} from '../../types/movie';
import { resolveStateForMediaItem } from '../../utils/mediaDedup';
import { GENRE_CATEGORIES } from '../../data/genreCategories';
import { SafeImage } from '../common/SafeImage';
import { MoviePoster } from '../common/MoviePoster';
import {
  fetchAndVerifyGenreTop50,
  getCachedGenreCollection,
} from '../../services/gemini';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Star,
  Key,
  AlertCircle,
  Clock,
  Zap,
  LayoutGrid,
  List,
  ArrowUpDown,
  FolderPlus,
  Check,
  X,
} from 'lucide-react';

interface GenreTop50DetailViewProps {
  genre: GenreCategoryItem;
  geminiApiKey?: string;
  geminiModel?: string;
  tmdbApiKey?: string;
  omdbApiKey?: string;
  initialCount?: number;
  userStates: Record<string, PersonalMediaState>;
  onBack: () => void;
  onSelectGenre?: (genre: GenreCategoryItem, count?: number) => void;
  onSelectMedia: (item: MediaItem) => void;
  onNavigateToGeminiSettings?: () => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string, item?: MediaItem) => void;
  onMarkWatched?: (id: string, item?: MediaItem) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  onToggleFavorite?: (id: string, item?: MediaItem) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  customLists?: CustomList[];
  onAddItemToList?: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList?: (listId: string, mediaId: string) => void;
  onAutoSaveAiList?: (title: string, description: string, items: MediaItem[]) => void;
  onManualSaveList?: (
    title: string,
    description: string,
    items: MediaItem[],
    isRenamedOrManual: boolean,
    existingListId?: string
  ) => void;
}

const COUNT_OPTIONS = [10, 20, 30, 40, 50] as const;

export const GenreTop50DetailView: React.FC<GenreTop50DetailViewProps> = ({
  genre,
  geminiApiKey,
  geminiModel = 'gemini-3.1-flash-lite',
  tmdbApiKey,
  omdbApiKey,
  initialCount = 20,
  userStates,
  onBack,
  onSelectGenre,
  onSelectMedia,
  onNavigateToGeminiSettings,
  onRemoveFromWatchlist,
  onMarkWatching,
  onDismissFromWatching,
  onToggleWatchlist,
  onToggleFavorite,
  onMarkWatched,
  onAddMediaToLibrary,
  customLists,
  onAddItemToList,
  onRemoveItemFromList,
  onAutoSaveAiList,
  onManualSaveList,
}) => {
  const [selectedCount, setSelectedCount] = useState<number>(initialCount);
  const [collection, setCollection] = useState<CachedGenreCollection | null>(() =>
    getCachedGenreCollection(genre.id, initialCount)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'missing_key' | 'invalid_key' | 'quota' | 'other' | null>(null);
  const [generationDurationSec, setGenerationDurationSec] = useState<number | null>(null);

  // View Mode: 'grid' (Watchlist Poster Cards) or 'list' (Watchlist List Rows)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Sort Mode: default 'year_desc' (2026, 2025, 2024...), 'rank', or 'rating'
  const [sortBy, setSortBy] = useState<'year_desc' | 'rank' | 'rating'>('year_desc');

  // Manual Save / Rename Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState('');
  const [saveDescInput, setSaveDescInput] = useState('');
  const [selectedTargetListId, setSelectedTargetListId] = useState<string>('');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  const modelDisplayName = useMemo(() => {
    const found = AVAILABLE_GEMINI_MODELS.find(m => m.id === geminiModel);
    return found ? found.name : geminiModel;
  }, [geminiModel]);

  const handleAutoSave = useCallback(
    (col: CachedGenreCollection) => {
      if (!onAutoSaveAiList || !col || !col.items || col.items.length === 0) return;
      const cleanTitle = genre.name.replace(/^Top \d+\s*/i, '');
      const listTitle = cleanTitle.toLowerCase().startsWith('top')
        ? cleanTitle
        : `Top ${col.items.length} ${cleanTitle}`;
      onAutoSaveAiList(
        listTitle,
        genre.subtitle || 'AI Curated Genre Collection',
        col.items
      );
    },
    [genre.name, genre.subtitle, onAutoSaveAiList]
  );

  const requestIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      requestIdRef.current += 1;
    };
  }, []);

  const loadCollection = useCallback(
    async (forceRefresh = false, countOverride?: number) => {
      const targetCount = countOverride || selectedCount;
      const reqId = ++requestIdRef.current;

      // 1. Check local cache if not forced
      if (!forceRefresh) {
        const cached = getCachedGenreCollection(genre.id, targetCount);
        if (cached && cached.items && cached.items.length > 0) {
          if (reqId !== requestIdRef.current) return;
          setCollection(cached);
          setError(null);
          setErrorType(null);
          setIsLoading(false);
          handleAutoSave(cached);
          return;
        }
      }

      // 2. Check for configured Gemini API key
      if (!geminiApiKey || !geminiApiKey.trim()) {
        if (reqId !== requestIdRef.current) return;
        setErrorType('missing_key');
        setError(
          'Gemini API key is required to generate this collection. Please connect your personal key in Settings.'
        );
        setIsLoading(false);
        return;
      }

      // 3. Trigger generation with progress
      const startTime = Date.now();
      setIsLoading(true);
      setError(null);
      setErrorType(null);
      setLoadingStep(`Curating Top ${targetCount} ${genre.name} with ${modelDisplayName}...`);

      const genreNameForApi =
        genre.mixedGenreNames && genre.mixedGenreNames.length > 0
          ? genre.mixedGenreNames.join(' & ')
          : genre.name;

      try {
        const { collection: newCollection } = await fetchAndVerifyGenreTop50({
          genreId: genre.id,
          genreName: genreNameForApi,
          mixedGenres: genre.mixedGenreNames,
          geminiApiKey,
          geminiModel,
          tmdbApiKey,
          omdbApiKey,
          count: targetCount,
          onProgress: (verified, total, current) => {
            if (reqId !== requestIdRef.current) return;
            setLoadingStep(
              `Fetching metadata from TMDB & OMDb (${verified}/${total})${current ? ` · ${current}` : ''}...`
            );
          },
        });

        if (reqId !== requestIdRef.current) return;
        setCollection(newCollection);
        handleAutoSave(newCollection);
        const elapsed = (Date.now() - startTime) / 1000;
        setGenerationDurationSec(elapsed);
      } catch (err: any) {
        if (reqId !== requestIdRef.current) return;
        const msg = err?.message || 'Failed to generate genre collection.';
        if (msg.includes('Gemini API key is required') || msg.includes('missing')) {
          setErrorType('missing_key');
        } else if (msg.includes('invalid') || msg.includes('permission')) {
          setErrorType('invalid_key');
        } else if (msg.includes('quota') || msg.includes('429')) {
          setErrorType('quota');
        } else {
          setErrorType('other');
        }
        setError(msg);
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
          setLoadingStep('');
        }
      }
    },
    [
      genre.id,
      genre.name,
      genre.mixedGenreNames,
      geminiApiKey,
      geminiModel,
      modelDisplayName,
      selectedCount,
      tmdbApiKey,
      omdbApiKey,
      handleAutoSave,
    ]
  );

  // Re-run when genre.id or selectedCount changes
  useEffect(() => {
    const cached = getCachedGenreCollection(genre.id, selectedCount);
    if (cached && cached.items && cached.items.length > 0) {
      setCollection(cached);
      setError(null);
      setErrorType(null);
      handleAutoSave(cached);
    } else {
      setCollection(null);
    }
    loadCollection(false, selectedCount);
  }, [genre.id, selectedCount, loadCollection, handleAutoSave]);

  // Format timestamp helper
  const formattedDate = collection?.generatedAt
    ? new Date(collection.generatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const currentDisplayCount = collection?.items?.length || selectedCount;

  // Sorted items based on active sort option (Year 2026-19xx default, Ranked, or Rating)
  const sortedItems = useMemo(() => {
    if (!collection?.items) return [];
    const items = [...collection.items];
    if (sortBy === 'year_desc') {
      return items.sort((a, b) => {
        const yearA = a.year || (a.releaseDate ? parseInt(a.releaseDate, 10) : 0);
        const yearB = b.year || (b.releaseDate ? parseInt(b.releaseDate, 10) : 0);
        return yearB - yearA;
      });
    }
    if (sortBy === 'rating') {
      return items.sort((a, b) => {
        const rA = a.imdbRating || a.tmdbRating || 0;
        const rB = b.imdbRating || b.tmdbRating || 0;
        return rB - rA;
      });
    }
    return items;
  }, [collection?.items, sortBy]);

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Save Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs sm:text-sm shadow-2xl border border-white/20 flex items-center gap-2 animate-scale-up">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)]/40 text-[var(--text-primary)] active:scale-95 transition border border-[var(--border-subtle)] shadow-xs cursor-pointer"
            aria-label="Back to Trending Genres"
            title="Back to Trending Genres"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 fill-current" />
                Top {currentDisplayCount}
              </span>
              {formattedDate && (
                <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  Updated {formattedDate}
                </span>
              )}
              {generationDurationSec !== null && (
                <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  {generationDurationSec.toFixed(1)}s
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight mt-1">
              {genre.name.replace(/^Top \d+\s*/i, '')}
            </h1>
            {genre.subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium line-clamp-2">
                {genre.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls: Count Selector + Regenerate + Save to Custom Lists */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Count Toggle */}
          <div className="inline-flex rounded-full bg-[var(--chip-bg)] p-1 border border-[var(--border-subtle)]">
            {COUNT_OPTIONS.map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => {
                  setSelectedCount(cnt);
                }}
                disabled={isLoading}
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

          <button
            onClick={() => loadCollection(true, selectedCount)}
            disabled={isLoading}
            className="px-4 py-2 rounded-full bg-[var(--bg-surface-card)] hover:bg-[var(--border-subtle)]/40 text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            title="Regenerate this collection with fresh curation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Generating...' : 'Regenerate'}</span>
          </button>

          {/* Prominent "Save to Lists" Option Button at the Top */}
          <button
            onClick={() => {
              const defaultCleanName = genre.name.replace(/^Top \d+\s*/i, '');
              const prefilledTitle = defaultCleanName.toLowerCase().startsWith('top')
                ? defaultCleanName
                : `Top ${currentDisplayCount} ${defaultCleanName}`;
              setSaveTitleInput(prefilledTitle);
              setSaveDescInput(genre.subtitle || 'Custom movie & TV series collection');
              setSelectedTargetListId('');
              setIsSaveModalOpen(true);
            }}
            disabled={isLoading || !collection?.items?.length}
            className="px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-95 text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            title="Manually save or rename this collection in your Custom Lists"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Save to Lists</span>
          </button>
        </div>
      </div>

      {/* Quick-Switch Genre Pills Bar */}
      {onSelectGenre && (
        <div className="space-y-2.5 pt-1 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Genre
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">
              Curated with <strong className="text-[var(--text-primary)] font-bold">{modelDisplayName}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {GENRE_CATEGORIES.map(g => {
              const isSelected = g.id === genre.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGenre(g, selectedCount)}
                  className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-3xs active:scale-95 select-none ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] ring-2 ring-[var(--accent-primary)]/20'
                      : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/40 border border-[var(--border-subtle)]'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading Progress State */}
      {isLoading && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center animate-pulse">
            <Sparkles className="w-7 h-7 fill-current" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Curating Top {selectedCount} {genre.name}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-md">
              {loadingStep || 'Connecting to Gemini AI and fetching metadata in parallel...'}
            </p>
          </div>
          <div className="w-full max-w-xs h-1.5 bg-[var(--chip-bg)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent-primary)] animate-indeterminate rounded-full" />
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Fast lightweight model active · Target under 10 seconds</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-8 sm:p-10 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            {errorType === 'missing_key' ? (
              <Key className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {errorType === 'missing_key'
                ? 'Gemini API Key Required'
                : errorType === 'invalid_key'
                ? 'Invalid Gemini API Key'
                : errorType === 'quota'
                ? 'API Quota Exceeded'
                : 'Unable to Generate Collection'}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              {error}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {onNavigateToGeminiSettings && (
              <button
                onClick={onNavigateToGeminiSettings}
                className="px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure in Settings</span>
              </button>
            )}
            <button
              onClick={() => loadCollection(true, selectedCount)}
              className="px-4 py-2.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/40 text-xs font-bold transition border border-[var(--border-subtle)] cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Collection Results - Watchlist Style Listing */}
      {!isLoading && collection && sortedItems.length > 0 && (
        <div className="space-y-6">
          {/* Header Controls: Sort Bar & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                All Titles ({sortedItems.length})
              </span>
              <span className="text-[11px] text-amber-500 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 fill-current" />
                {collection.items.length} titles
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {/* Sort Options */}
              <div className="flex items-center gap-1 bg-[var(--chip-bg)] rounded-full p-1 border border-[var(--border-subtle)] text-xs">
                <ArrowUpDown className="w-3 h-3 text-[var(--text-secondary)] ml-1.5 shrink-0" />
                <button
                  onClick={() => setSortBy('year_desc')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    sortBy === 'year_desc'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Arrange titles chronologically starting with 2026, 2025, 2024..."
                >
                  Year (2026 - 19xx)
                </button>
                <button
                  onClick={() => setSortBy('rank')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    sortBy === 'rank'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Ranked
                </button>
                <button
                  onClick={() => setSortBy('rating')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    sortBy === 'rating'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Rating
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-[var(--chip-bg)] rounded-full p-1 border border-[var(--border-subtle)]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Watchlist Poster Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Watchlist List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mode 1: Grid View (Watchlist Poster Cards) */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {sortedItems.map((item, index) => {
                const originalIndex = collection.items.findIndex(i => i.id === item.id);
                const rank = originalIndex >= 0 ? originalIndex + 1 : index + 1;

                return (
                  <MoviePoster
                    key={item.id}
                    item={item}
                    showRanking={sortBy === 'rank' ? rank : undefined}
                    userState={resolveStateForMediaItem(item, userStates)}
                    onClick={() => onSelectMedia(item)}
                    onRemoveFromWatchlist={onRemoveFromWatchlist}
                    onMarkWatching={onMarkWatching}
                    onDismissFromWatching={onDismissFromWatching}
                    onToggleWatchlist={onToggleWatchlist}
                    onMarkWatched={onMarkWatched}
                    onToggleFavorite={onToggleFavorite}
                    onAddMediaToLibrary={onAddMediaToLibrary}
                    customLists={customLists}
                    onAddItemToList={onAddItemToList}
                    onRemoveItemFromList={onRemoveItemFromList}
                  />
                );
              })}
            </div>
          ) : (
            /* Mode 2: List View (Watchlist Horizontal Cards) */
            <div className="space-y-3">
              {sortedItems.map((item, index) => {
                const originalIndex = collection.items.findIndex(i => i.id === item.id);
                const rank = originalIndex >= 0 ? originalIndex + 1 : index + 1;
                const reason = collection.curationReasonings?.[item.id];
                const state = resolveStateForMediaItem(item, userStates);
                const rating = state?.personalRating || (item.imdbRating || item.tmdbRating || 0);

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectMedia(item)}
                    className="group p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-card)] hover:bg-[var(--chip-bg)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer text-left select-none"
                  >
                    {/* Rank Badge */}
                    <div className="w-8 h-8 rounded-xl bg-[var(--chip-bg)] group-hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-black text-xs flex items-center justify-center shrink-0">
                      #{rank}
                    </div>

                    {/* Poster Thumbnail */}
                    <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-[var(--chip-bg)] shrink-0 shadow-2xs">
                      <SafeImage
                        src={item.posterUrl || item.backdropUrl}
                        fallbackSrc={item.fallbackPosterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shrink-0">
                          {item.year}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] shrink-0 uppercase tracking-wider">
                          {item.type === 'tv' ? 'Series' : 'Movie'}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] flex-wrap">
                        {rating > 0 && (
                          <span className="flex items-center gap-1 font-bold text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>{rating.toFixed(1)}</span>
                          </span>
                        )}
                        {item.genres && item.genres.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[200px] sm:max-w-none">
                              {item.genres.slice(0, 3).join(' · ')}
                            </span>
                          </>
                        )}
                      </div>

                      {reason ? (
                        <p className="mt-1.5 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed italic">
                          "{reason}"
                        </p>
                      ) : item.overview ? (
                        <p className="mt-1.5 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {item.overview}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save / Rename Collection Modal */}
      {isSaveModalOpen && collection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsSaveModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--bg-surface-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border-subtle)] shadow-2xl z-10 space-y-5 animate-scale-up text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)]">
                  Custom Collection
                </span>
                <h3 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  Save to Custom Lists
                </h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Save all <strong className="text-[var(--text-primary)] font-bold">{collection.items.length} titles</strong> into your main lists section. Renaming the collection will save it as a personal custom shelf without the AI label.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!saveTitleInput.trim()) return;

                const defaultCleanName = genre.name.replace(/^Top \d+\s*/i, '');
                const defaultOriginalTitle = defaultCleanName.toLowerCase().startsWith('top')
                  ? defaultCleanName
                  : `Top ${collection.items.length} ${defaultCleanName}`;

                const isRenamed = saveTitleInput.trim().toLowerCase() !== defaultOriginalTitle.toLowerCase();

                if (onManualSaveList) {
                  onManualSaveList(
                    saveTitleInput.trim(),
                    saveDescInput.trim(),
                    collection.items,
                    isRenamed, // true = renamed/manual, strips AI label badge
                    selectedTargetListId || undefined
                  );
                }
                setSaveSuccessToast(`✓ Saved all ${collection.items.length} titles to "${saveTitleInput.trim()}"`);
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => setSaveSuccessToast(null), 3000);
                setIsSaveModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Collection Title
                </label>
                <input
                  type="text"
                  value={saveTitleInput}
                  onChange={e => setSaveTitleInput(e.target.value)}
                  placeholder="e.g. Must-Watch Comedies 2026"
                  required
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={saveDescInput}
                  onChange={e => setSaveDescInput(e.target.value)}
                  placeholder="e.g. My top picked comedy movies and series"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {customLists && customLists.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Save Target
                  </label>
                  <select
                    value={selectedTargetListId}
                    onChange={e => setSelectedTargetListId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] cursor-pointer"
                  >
                    <option value="">+ Create New Custom Shelf</option>
                    {customLists.map(l => (
                      <option key={l.id} value={l.id}>
                        Append to: {l.title} ({l.itemIds.length} titles)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95 cursor-pointer"
                >
                  Save Collection ({collection.items.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
