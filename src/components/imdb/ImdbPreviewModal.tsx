import React, { useState, useEffect, useRef } from 'react';
import { parseImdbInput, getCanonicalImdbUrl } from '../../services/imdbParser';
import { fetchImdbPreview, ImdbMetadataPreview } from '../../services/omdb';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { areMediaItemsSame, resolveStateForMediaItem } from '../../utils/mediaDedup';
import { loadUserSettings } from '../../services/storage';
import { SafeImage } from '../common/SafeImage';
import { CastCrewDetailModal, SelectedPersonInfo } from '../common/CastCrewDetailModal';
import { openStreamingPlatform } from '../../services/streamingDirectUrls';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Star,
  Film,
  Tv,
  Calendar,
  Clock,
  Award,
  Globe,
  DollarSign,
  Plus,
  Bookmark,
  Sparkles,
  ClipboardPaste,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  User,
} from 'lucide-react';

interface ImdbPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInput?: string;
  customApiKey?: string;
  onSelectMedia?: (item: MediaItem) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  userStates?: Record<string, PersonalMediaState>;
  mediaItems?: MediaItem[];
}

const SAMPLE_TITLES = [
  { label: 'The Matrix (Movie)', input: 'https://www.imdb.com/title/tt0133093/' },
  { label: 'Breaking Bad (Series)', input: 'https://www.imdb.com/title/tt0903747/' },
  { label: 'Guardians Vol. 2', input: 'tt3896198' },
];

export const ImdbPreviewModal: React.FC<ImdbPreviewModalProps> = ({
  isOpen,
  onClose,
  initialInput = '',
  customApiKey,
  onSelectMedia,
  onAddMediaToLibrary,
  onToggleWatchlist,
  userStates = {},
  mediaItems = [],
}) => {
  const [inputVal, setInputVal] = useState(initialInput);
  const [parsedId, setParsedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPersonInfo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImdbMetadataPreview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync initial input and focus
  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    if (isOpen) {
      const startVal = initialInput || '';
      setInputVal(startVal);
      setPreviewData(null);
      setFetchError(null);
      setValidationError(null);
      setAddedSuccess(false);

      if (startVal.trim()) {
        handleTriggerFetch(startVal.trim());
      }

      focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSelectedPerson(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    return () => {
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen, initialInput]);

  // Handle escape key (yield to nested CastCrewDetailModal if open)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPerson) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedPerson]);

  const handleTriggerFetch = async (queryToFetch: string) => {
    const parseResult = parseImdbInput(queryToFetch);
    if (!parseResult.isValid || !parseResult.imdbId) {
      setValidationError(parseResult.error || 'Invalid IMDb input.');
      setParsedId(null);
      setPreviewData(null);
      return;
    }

    setValidationError(null);
    setParsedId(parseResult.imdbId);
    setFetchError(null);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetchImdbPreview(parseResult.imdbId, customApiKey, controller.signal);
      if (controller.signal.aborted) return;

      if (res.success && res.data) {
        setPreviewData(res.data);
        setFetchError(null);
      } else {
        setPreviewData(null);
        setFetchError(res.error || 'Failed to fetch title metadata from IMDb.');
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      if (!isAbort) {
        setPreviewData(null);
        setFetchError(err instanceof Error ? err.message : 'Network error occurred while fetching IMDb data.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (val: string) => {
    setInputVal(val);
    setFetchError(null);
    if (!val.trim()) {
      setValidationError(null);
      setParsedId(null);
      return;
    }

    const res = parseImdbInput(val);
    if (res.isValid && res.imdbId) {
      setValidationError(null);
      setParsedId(res.imdbId);
    } else {
      setValidationError(res.error || null);
      setParsedId(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) {
      setValidationError('Please enter an IMDb link or title ID.');
      return;
    }
    handleTriggerFetch(inputVal.trim());
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputVal(text);
          handleInputChange(text);
          handleTriggerFetch(text.trim());
        }
      } else {
        inputRef.current?.focus();
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleCopyId = (idToCopy: string) => {
    try {
      navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleAddMedia = () => {
    if (!previewData?.mediaItem) return;
    if (onAddMediaToLibrary) {
      onAddMediaToLibrary(previewData.mediaItem);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    }
  };

  const handleOpenInPlayer = () => {
    if (!previewData?.mediaItem) return;
    if (onAddMediaToLibrary) {
      onAddMediaToLibrary(previewData.mediaItem);
    }
    if (onSelectMedia) {
      onSelectMedia(previewData.mediaItem);
      onClose();
    }
  };

  if (!isOpen) return null;

  const matchedLibraryItem = previewData?.mediaItem
    ? mediaItems.find(m => areMediaItemsSame(m, previewData.mediaItem))
    : undefined;
  const currentUserState = previewData?.mediaItem
    ? resolveStateForMediaItem(matchedLibraryItem || previewData.mediaItem, userStates, mediaItems)
    : undefined;
  const inWatchlist = Boolean(currentUserState?.inWatchlist);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="IMDb Link Preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!selectedPerson) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl my-auto bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[92vh] z-10 animate-scale-up">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--modal-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* IMDb Golden Badge */}
            <div className="px-2.5 py-1 rounded-lg bg-[#F5C518] text-[#000000] font-black text-xs sm:text-sm tracking-wider shadow-xs flex items-center gap-1 select-none">
              <span>IMDb</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Movie & TV Series Link Preview
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-medium">
                Instant title detection & verified metadata via OMDb
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close IMDb Preview Modal"
            title="Close (Esc)"
            className="p-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white transition focus:outline-none shadow-sm shrink-0 flex items-center justify-center border border-red-700"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Input & Action Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--modal-bg)] space-y-3">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="Paste IMDb link (https://www.imdb.com/title/tt3896198/) or ID (tt...)"
                aria-label="IMDb URL or Title ID"
                className="w-full pl-3.5 pr-20 py-2.5 rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {inputVal && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('')}
                    aria-label="Clear input"
                    className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  title="Paste from clipboard"
                  aria-label="Paste from clipboard"
                  className="px-2 py-1 rounded-lg bg-[var(--chip-bg)] text-[var(--chip-text)] hover:opacity-90 font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <ClipboardPaste className="w-3 h-3 text-[var(--accent-primary)]" />
                  <span className="hidden xs:inline">Paste</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-50 transition active:scale-95 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>Fetch Details</span>
                </>
              )}
            </button>
          </form>

          {/* Real-time Validation Message */}
          {validationError && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {parsedId && !validationError && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold px-1">
              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
              <span>Detected IMDb ID: <span className="font-mono underline">{parsedId}</span></span>
            </div>
          )}

          {/* Quick Sample Links */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[var(--text-secondary)]">
            <span className="font-bold flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" /> Try sample:
            </span>
            {SAMPLE_TITLES.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setInputVal(s.input);
                  handleInputChange(s.input);
                  handleTriggerFetch(s.input);
                }}
                className="px-2.5 py-1 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium transition active:scale-95 cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* 1. Loading State */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-full sm:w-44 h-64 rounded-2xl bg-[var(--bg-surface-elevated)] shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-7 w-3/4 bg-[var(--bg-surface-elevated)] rounded-lg" />
                  <div className="h-4 w-1/2 bg-[var(--bg-surface-elevated)] rounded-md" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-[var(--bg-surface-elevated)] rounded-full" />
                    <div className="h-6 w-20 bg-[var(--bg-surface-elevated)] rounded-full" />
                    <div className="h-6 w-24 bg-[var(--bg-surface-elevated)] rounded-full" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3 w-full bg-[var(--bg-surface-elevated)] rounded" />
                    <div className="h-3 w-full bg-[var(--bg-surface-elevated)] rounded" />
                    <div className="h-3 w-4/5 bg-[var(--bg-surface-elevated)] rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {!isLoading && fetchError && (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-amber-900 dark:text-amber-200">
                Metadata Retrieval Issue
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 max-w-md mx-auto leading-relaxed">
                {fetchError}
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => inputVal.trim() && handleTriggerFetch(inputVal.trim())}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold transition active:scale-95"
                >
                  Retry Fetch
                </button>
              </div>
            </div>
          )}

          {/* 3. Empty / Initial Prompt State */}
          {!isLoading && !fetchError && !previewData && (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center mx-auto shadow-md">
                <Film className="w-8 h-8 stroke-[2]" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                Ready for IMDb Link or Title ID
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                Paste any desktop (<code className="text-[11px] font-mono bg-[var(--chip-bg)] px-1 rounded">imdb.com/title/...</code>) or mobile link, or a raw IMDb ID (<code className="text-[11px] font-mono bg-[var(--chip-bg)] px-1 rounded">tt3896198</code>) to inspect comprehensive ratings, cast, synopsis, and details.
              </p>
            </div>
          )}

          {/* 4. Rich Preview Data Card */}
          {!isLoading && previewData && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Poster Artwork with fallback */}
                <div className="w-full sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-md shrink-0 relative group">
                  {previewData.posterUrl ? (
                    <SafeImage
                      src={previewData.posterUrl}
                      alt={previewData.title}
                      fallbackTitle={previewData.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                      {previewData.type === 'series' ? (
                        <Tv className="w-10 h-10 mb-2 opacity-50" />
                      ) : (
                        <Film className="w-10 h-10 mb-2 opacity-50" />
                      )}
                      <span className="text-xs font-bold">{previewData.title}</span>
                      <span className="text-[10px] opacity-75 mt-1">No poster available from OMDb</span>
                    </div>
                  )}
                </div>

                {/* Primary Metadata */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
                      {previewData.title}
                    </h3>

                    {/* Metadata line without pills */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)] font-semibold mt-1">
                      {previewData.year && <span>{previewData.year}</span>}
                      {previewData.year && <span aria-hidden="true">·</span>}

                      <span className="capitalize">{previewData.typeDisplay}</span>

                      {previewData.rated && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-[var(--text-primary)]">{previewData.rated}</span>
                        </>
                      )}

                      {previewData.runtime && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {previewData.runtime}
                          </span>
                        </>
                      )}

                      {previewData.totalSeasons && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-[var(--accent-primary)]">
                            {previewData.totalSeasons} {parseInt(previewData.totalSeasons, 10) === 1 ? 'Season' : 'Seasons'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ratings Row */}
                  <div className="flex flex-wrap items-center gap-2.5 py-1">
                    {/* Official IMDb Star Rating */}
                    {previewData.imdbRating && previewData.imdbRating > 0 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5C518]/15 border border-[#F5C518]/30 text-[#000000] dark:text-[#F5C518] shadow-xs">
                        <Star className="w-4 h-4 fill-[#F5C518] text-[#F5C518]" />
                        <span className="font-black text-sm">{previewData.imdbRating.toFixed(1)}</span>
                        <span className="text-[11px] opacity-75 font-bold">/10</span>
                        {previewData.imdbVotes && (
                          <span className="text-[10px] opacity-70 font-medium ml-1">
                            ({previewData.imdbVotes})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-secondary)] italic">
                        No IMDb rating recorded
                      </span>
                    )}

                    {/* Additional Critic Ratings (Rotten Tomatoes / Metacritic) */}
                    {previewData.ratings.map(r => {
                      if (r.source === 'Internet Movie Database') return null;
                      return (
                        <div
                          key={r.source}
                          className="px-2.5 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5"
                        >
                          <span className="text-[10px] text-[var(--text-secondary)] font-normal">{r.source}:</span>
                          <span>{r.value}</span>
                        </div>
                      );
                    })}

                    {previewData.metascore && (
                      <div className="px-2.5 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)]">
                        <span className="text-[10px] text-[var(--text-secondary)] font-normal">Metascore: </span>
                        <span>{previewData.metascore}</span>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {previewData.genresList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {previewData.genresList.map(g => (
                        <span
                          key={g}
                          className="px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-xs font-bold"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Plot / Synopsis */}
                  {previewData.plot && (
                    <div className="pt-1">
                      <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed opacity-90">
                        {previewData.plot}
                      </p>
                    </div>
                  )}

                  {/* People / Creators / Crew */}
                  <div className="space-y-1.5 pt-2 text-xs border-t border-[var(--border-subtle)]">
                    {previewData.director && (
                      <div className="flex gap-2 items-center">
                        <span className="text-[var(--text-secondary)] font-bold w-16 shrink-0">Director:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPerson({
                            name: previewData.director!,
                            job: 'Director',
                            roleType: 'crew',
                            currentMediaTitle: previewData.title,
                            currentMediaId: previewData.mediaItem.id
                          })}
                          className="text-[var(--text-primary)] font-bold hover:text-[var(--accent-primary)] hover:underline text-left transition"
                          title={`View ${previewData.director} profile`}
                        >
                          {previewData.director}
                        </button>
                      </div>
                    )}
                    {previewData.writer && (
                      <div className="flex gap-2 items-center">
                        <span className="text-[var(--text-secondary)] font-bold w-16 shrink-0">Writer:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPerson({
                            name: previewData.writer!,
                            job: 'Writer',
                            roleType: 'crew',
                            currentMediaTitle: previewData.title,
                            currentMediaId: previewData.mediaItem.id
                          })}
                          className="text-[var(--text-primary)] font-bold hover:text-[var(--accent-primary)] hover:underline text-left transition"
                          title={`View ${previewData.writer} profile`}
                        >
                          {previewData.writer}
                        </button>
                      </div>
                    )}
                    {previewData.actors && (
                      <div className="flex gap-2 items-start">
                        <span className="text-[var(--text-secondary)] font-bold w-16 shrink-0 pt-0.5">Cast:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {previewData.actors.split(',').map((actor, aIdx) => {
                            const cleanName = actor.trim();
                            if (!cleanName) return null;
                            return (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => setSelectedPerson({
                                  name: cleanName,
                                  roleType: 'cast',
                                  currentMediaTitle: previewData.title,
                                  currentMediaId: previewData.mediaItem.id
                                })}
                                className="px-2 py-0.5 rounded-lg bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-primary)] transition active:scale-95 shadow-2xs cursor-pointer"
                                title={`View ${cleanName} profile`}
                              >
                                {cleanName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Streaming Watch Providers with Direct Landing URLs */}
                  {previewData.mediaItem.providers && previewData.mediaItem.providers.length > 0 && (
                    <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] block uppercase tracking-wide">
                          Streaming & Watch Services:
                        </span>
                        <span className="text-[10px] text-[var(--accent-primary)] font-semibold">
                          Click to launch directly
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {previewData.mediaItem.providers.map((p, idx) => (
                          <button
                            key={`${p.name}-${idx}`}
                            type="button"
                            onClick={() => openStreamingPlatform(p.name, previewData.mediaItem.title, previewData.mediaItem.type, previewData.mediaItem.year)}
                            title={`Watch "${previewData.mediaItem.title}" directly on ${p.name}`}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:scale-[1.02] active:scale-98 text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition cursor-pointer select-none"
                          >
                            {p.logoUrl ? (
                              <img src={p.logoUrl} alt={p.name} className="w-4 h-4 rounded-md object-cover" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            )}
                            <span>{p.name}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">({p.type})</span>
                            <ExternalLink className="w-2.5 h-2.5 text-[var(--accent-primary)] ml-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Complete Crew List from TMDB / OMDb */}
                  {previewData.mediaItem.crew && previewData.mediaItem.crew.length > 0 && (
                    <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] block uppercase tracking-wide">
                        Full Crew ({previewData.mediaItem.crew.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewData.mediaItem.crew.map((c, i) => (
                          <button
                            key={`${c.name}-${i}`}
                            type="button"
                            onClick={() => setSelectedPerson({
                              name: c.name,
                              job: c.job,
                              roleType: 'crew',
                              currentMediaTitle: previewData.title,
                              currentMediaId: previewData.mediaItem.id
                            })}
                            title={`View ${c.name} profile`}
                            className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-primary)] transition active:scale-95 cursor-pointer text-left shadow-2xs"
                          >
                            <strong>{c.name}</strong> <span className="text-[10px] text-[var(--text-secondary)]">({c.job})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TV Seasons & Episode Details */}
                  {previewData.mediaItem.type === 'tv' && previewData.mediaItem.seasons && previewData.mediaItem.seasons.length > 0 && (
                    <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[var(--text-secondary)] uppercase tracking-wide">
                          TV Seasons ({previewData.mediaItem.seasonsCount || previewData.mediaItem.seasons.length}) & Episodes ({previewData.mediaItem.episodesCount || 'Full catalog'}):
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {previewData.mediaItem.seasons.map(s => (
                          <div key={s.seasonNumber} className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
                            <div className="font-bold text-[var(--text-primary)]">{s.name}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">{s.episodeCount} {s.episodeCount === 1 ? 'Episode' : 'Episodes'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface)] text-xs border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">IMDb Title ID</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{previewData.imdbId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Released</span>
                  <span className="font-bold text-[var(--text-primary)]">{previewData.released || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Box Office</span>
                  <span className="font-bold text-[var(--text-primary)]">{previewData.boxOffice || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Country / Lang</span>
                  <span className="font-bold text-[var(--text-primary)] truncate block">
                    {[previewData.country, previewData.language].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </div>
              </div>

              {previewData.awards && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] text-xs font-bold">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>{previewData.awards}</span>
                </div>
              )}

              {/* Integrated Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  {/* Copy IMDb ID Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyId(previewData.imdbId)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-3xs"
                    title="Copy IMDb Title ID to clipboard"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>

                  {/* View on IMDb Safe Link */}
                  <a
                    href={getCanonicalImdbUrl(previewData.imdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-[#F5C518] hover:bg-[#e4b712] text-[#000000] text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                    title="Open official title page on IMDb in a new window"
                  >
                    <span>View on IMDb</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Toggle Watchlist */}
                  {onToggleWatchlist && (
                    <button
                      type="button"
                      onClick={() => {
                        if (previewData.mediaItem) {
                          handleAddMedia();
                          onToggleWatchlist(previewData.mediaItem.id || previewData.imdbId, previewData.mediaItem);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 shadow-3xs ${
                        inWatchlist
                          ? 'bg-[#F5C518] hover:bg-[#E2B616] text-[#121212] font-black border border-[#DFB00F]'
                          : 'bg-[var(--bg-surface)] hover:bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''}`} />
                      <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                    </button>
                  )}

                  {/* Add to Library / Open in Player */}
                  <button
                    type="button"
                    onClick={handleOpenInPlayer}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-[var(--bg-primary)] text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Open in EHSAAN PLAY</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Minimal Details Page for Cast & Crew with Big Circular Portrait */}
      {selectedPerson && (
        <CastCrewDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onSelectPerson={(newPerson) => setSelectedPerson(newPerson)}
          currentMedia={previewData?.mediaItem || null}
          currentCast={previewData?.mediaItem?.cast || []}
          currentCrew={previewData?.mediaItem?.crew || []}
          mediaItems={mediaItems}
          userStates={userStates}
          onSelectMedia={(item) => {
            setSelectedPerson(null);
            onClose();
            if (onSelectMedia) {
              onSelectMedia(item);
            }
          }}
          onToggleWatchlist={onToggleWatchlist}
          tmdbApiKey={loadUserSettings().tmdbApiKey}
        />
      )}
    </div>
  );
};
