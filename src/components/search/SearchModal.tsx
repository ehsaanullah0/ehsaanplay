import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MediaItem, MediaType, PersonalMediaState } from '../../types/movie';
import { searchWithFallback, SearchProviderMode, SearchDiagnosticInfo } from '../../services/metadataFallback';

import { parseImdbInput } from '../../services/imdbParser';
import { Search, X, Star, Loader2, Plus, Check, Bookmark, Database, Sparkles, Layers, AlertCircle, Info, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { SafeImage } from '../common/SafeImage';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  localMediaItems: MediaItem[];
  tmdbApiKey?: string;
  omdbApiKey?: string;
  onAddMediaToLibrary: (item: MediaItem) => void;
  userStates?: Record<string, PersonalMediaState>;
  onToggleWatchlist?: (id: string) => void;
  onToggleWatched?: (id: string) => void;
  onOpenImdbPreview?: (query?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  localMediaItems,
  tmdbApiKey,
  omdbApiKey,
  onAddMediaToLibrary,
  userStates = {},
  onToggleWatchlist,
  onToggleWatched,
  onOpenImdbPreview,
}) => {
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | MediaType>('all');
  const [remoteResults, setRemoteResults] = useState<MediaItem[]>([]);
  const [searchSource, setSearchSource] = useState<'tmdb' | 'omdb' | 'cache' | 'empty'>('empty');
  const [providerMode, setProviderMode] = useState<SearchProviderMode>('auto');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDiagnostic, setSearchDiagnostic] = useState<SearchDiagnosticInfo | null>(null);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCounterRef = useRef<number>(0);

  // Auto-detect IMDb link or ID in search input
  const detectedImdb = useMemo(() => parseImdbInput(query), [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setRemoteResults([]);
      setSearchSource('empty');
      setSearchError(null);
      setSearchDiagnostic(null);
      setShowDiagnosticPanel(false);
    }
  }, [isOpen]);

  // Live search handler with fast debounce, provider selection and monotonic request sequencing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRemoteResults([]);
      setSearchSource('empty');
      setSearchError(null);
      setSearchDiagnostic(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const searchId = ++searchCounterRef.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const { items, source, error, diagnostic } = await searchWithFallback(trimmed, tmdbApiKey, omdbApiKey, controller.signal, providerMode);

        if (!controller.signal.aborted && searchId === searchCounterRef.current) {
          setRemoteResults(items || []);
          setSearchSource(source);
          setSearchError(error || null);
          setSearchDiagnostic(diagnostic || null);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted && searchId === searchCounterRef.current) {
          setRemoteResults([]);
          setSearchSource('empty');
          const msg = err instanceof Error ? err.message : 'Search request failed';
          setSearchError(msg);
        }
      } finally {
        if (!controller.signal.aborted && searchId === searchCounterRef.current) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, tmdbApiKey, omdbApiKey, providerMode]);

  // Helper to normalize strings for clean alphanumeric matching while preserving Unicode letters
  const normalizeLetters = (str: string): string => {
    return (str || '')
      .toLowerCase()
      .normalize('NFKC')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Relevance scorer: prioritizes exact, prefix, cast, and popular consensus matches
  const calculateQueryRelevance = (item: MediaItem, rawQuery: string): number => {
    const q = normalizeLetters(rawQuery);
    if (!q) return 10;

    const title = normalizeLetters(item.title);
    const orig = normalizeLetters(item.originalTitle);
    const votes = item.voteCount || 0;
    const hasPoster = Boolean(item.posterUrl && item.posterUrl.trim().length > 0);
    const pop = item.popularity || 0;
    const qAlpha = q.replace(/[^a-z0-9]/g, '');
    const titleAlpha = title.replace(/[^a-z0-9]/g, '');
    const origAlpha = orig.replace(/[^a-z0-9]/g, '');

    const isExactTitle = title === q;
    const isExactOrig = orig === q;
    const isAlphaExact = qAlpha.length > 2 && (titleAlpha === qAlpha || origAlpha === qAlpha);

    const queryTokens = q.split(' ').filter(Boolean);
    const titleTokens = title.split(' ').filter(Boolean);
    const origTokens = orig.split(' ').filter(Boolean);

    let textScore = 0;
    if (isExactTitle) {
      textScore = 1400; // Perfect display title match
    } else if (isExactOrig || isAlphaExact) {
      textScore = 1200; // Original language or alphanumeric match
    } else if (title.startsWith(q)) {
      textScore = 950; // Display title starts with query phrase
    } else if (orig.startsWith(q)) {
      textScore = 850;
    } else if (title.includes(q)) {
      textScore = 800; // Substring in display title
    } else if (orig.includes(q)) {
      textScore = 700;
    } else {
      // Multi-word matching
      const allWordsInTitle = queryTokens.length > 0 && queryTokens.every(qw =>
        titleTokens.some(tw => tw === qw || tw.startsWith(qw))
      );
      const allWordsInOrig = queryTokens.length > 0 && queryTokens.every(qw =>
        origTokens.some(tw => tw === qw || tw.startsWith(qw))
      );

      if (allWordsInTitle) {
        textScore = 750;
      } else if (allWordsInOrig) {
        textScore = 650;
      } else {
        // Direct cast match check
        const castMatch = (item.cast || []).some(c => {
          const cName = normalizeLetters(c.name);
          return cName === q || cName.startsWith(q) || queryTokens.every(qw => cName.includes(qw));
        });

        if (castMatch) {
          textScore = 720;
        } else {
          // Partial word match check
          const anyWordInTitle = queryTokens.some(qw =>
            titleTokens.some(tw => tw === qw || tw.startsWith(qw))
          );
          if (anyWordInTitle) {
            textScore = 450;
          } else if (normalizeLetters(item.overview || '').includes(q)) {
            textScore = 300;
          } else {
            // For items returned by OMDb/OMDb search engine, retain base score
            textScore = 200;
          }
        }
      }
    }

    // Consensus vote boost & real traffic popularity boost
    const voteBoost = Math.min(350, Math.log10(Math.max(votes, 1)) * 85);
    const popBoost = Math.min(250, Math.log10(Math.max(pop, 1) + 1) * 70);
    const posterModifier = hasPoster ? 50 : 0; // Never subtract or eliminate movies without posters!

    return Math.max(1, textScore + voteBoost + popBoost + posterModifier);
  };

  // Combined, clean results
  const searchResults = useMemo(() => {
    if (!query.trim()) return localMediaItems.slice(0, 8); // Initial Suggestions

    const cleanQ = query.trim();
    const qNorm = normalizeLetters(cleanQ);

    // 1. Filter local matches
    const localMatches = localMediaItems.filter(item => {
      const t = normalizeLetters(item.title);
      const o = normalizeLetters(item.originalTitle);
      return t.includes(qNorm) || o.includes(qNorm) || qNorm.split(' ').every(w => t.includes(w) || o.includes(w));
    });

    // 2. Merge local and remote results, deduplicating by ID and title
    const merged: MediaItem[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    for (const item of localMatches) {
      const key = `${item.type}_${normalizeLetters(item.title)}`;
      if (!seenIds.has(item.id) && !seenTitles.has(key)) {
        seenIds.add(item.id);
        seenTitles.add(key);
        merged.push(item);
      }
    }

    // Add ALL remote results returned by the search provider (preserves valid titles)
    for (const rem of remoteResults) {
      const key = `${rem.type}_${normalizeLetters(rem.title)}`;
      if (!seenIds.has(rem.id) && !seenTitles.has(key)) {
        seenIds.add(rem.id);
        seenTitles.add(key);
        merged.push(rem);
      }
    }

    // Filter by format (all, movie, tv)
    const formatFiltered = merged.filter(item => {
      if (formatFilter === 'all') return true;
      return item.type === formatFilter;
    });

    // 3. Sort by precision relevance score
    return formatFiltered.sort((a, b) => {
      const scoreA = calculateQueryRelevance(a, cleanQ);
      const scoreB = calculateQueryRelevance(b, cleanQ);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return (b.voteCount || 0) - (a.voteCount || 0);
    });
  }, [query, localMediaItems, remoteResults, formatFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 pt-12 sm:pt-20 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] z-10 overflow-hidden flex flex-col max-h-[84vh]">
        {/* Clean, Minimalist Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center gap-2 sm:gap-3 bg-[var(--modal-bg)]">
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
            placeholder="Search movies, series, actors..."
            className="w-full bg-transparent text-base sm:text-lg font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Options / Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0 ${
              isMoreOpen
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={isMoreOpen ? "Hide filter options" : "Show filter options"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Options</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Filled Blood Red Cross Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white transition focus:outline-none shadow-sm shrink-0 flex items-center justify-center"
            title="Close search (Esc)"
            aria-label="Close search"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Collapsible Options Drawer */}
        {isMoreOpen && (
          <div className="p-3.5 sm:p-4 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] space-y-3 animate-fade-in text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Type Format Filters */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] mr-1">Type:</span>
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                    formatFilter === 'all'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('movie')}
                  className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                    formatFilter === 'movie'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('tv')}
                  className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                    formatFilter === 'tv'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Series
                </button>
              </div>

              {/* API Provider Selection */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] mr-1">Provider:</span>
                <button
                  type="button"
                  onClick={() => setProviderMode('auto')}
                  className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 transition ${
                    providerMode === 'auto'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${providerMode === 'auto' ? 'bg-[var(--bg-primary)]' : 'bg-indigo-500'}`} />
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setProviderMode('tmdb')}
                  className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 transition ${
                    providerMode === 'tmdb'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${providerMode === 'tmdb' ? 'bg-red-400' : 'bg-red-800'}`} />
                  TMDB
                </button>
                <button
                  type="button"
                  onClick={() => setProviderMode('omdb')}
                  className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 transition ${
                    providerMode === 'omdb'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${providerMode === 'omdb' ? 'bg-blue-300' : 'bg-blue-800'}`} />
                  OMDb
                </button>
              </div>

              {/* IMDb Link Import Modal Action */}
              {onOpenImdbPreview && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImdbPreview(query);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#F5C518] hover:bg-[#e4b712] text-black font-black text-xs flex items-center gap-1 transition active:scale-95 shrink-0 shadow-2xs"
                >
                  <span>IMDb Import</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clean Status Sub-bar: Result Counter & Diagnostics Toggle */}
        <div className="px-5 py-2 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 font-bold tabular-nums">
            {isSearching ? (
              <span className="flex items-center gap-1.5 text-[var(--accent-primary)] animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching {providerMode === 'tmdb' ? 'TMDB' : providerMode === 'omdb' ? 'OMDb' : 'catalog'}...
              </span>
            ) : searchError ? (
              <button
                type="button"
                onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
                className="flex items-center gap-1 text-rose-500 hover:underline"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Request issue - view details</span>
              </button>
            ) : searchSource === 'tmdb' ? (
              <span className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <span className="w-2 h-2 rounded-full bg-red-800 shrink-0" />
                <span>TMDB · {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}</span>
                {searchDiagnostic && <span className="text-[10px] opacity-70 font-mono">({searchDiagnostic.durationMs}ms)</span>}
              </span>
            ) : searchSource === 'omdb' ? (
              <span className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <span className="w-2 h-2 rounded-full bg-blue-800 shrink-0" />
                <span>OMDb {providerMode === 'auto' ? 'Fallback' : ''} · {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}</span>
                {searchDiagnostic && <span className="text-[10px] opacity-70 font-mono">({searchDiagnostic.durationMs}ms)</span>}
              </span>
            ) : searchSource === 'cache' ? (
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Offline Cache · {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span>
                  {query.trim()
                    ? 'No matches found'
                    : `Featured · ${searchResults.length} ${searchResults.length === 1 ? 'title' : 'titles'}`}
                </span>
              </span>
            )}
          </div>

          {searchDiagnostic && (
            <button
              type="button"
              onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
              className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 select-none"
            >
              <Info className="w-3 h-3" />
              <span>{showDiagnosticPanel ? 'Hide Logs' : 'Diagnostics'}</span>
            </button>
          )}
        </div>

        {/* Diagnostic Panel Dropdown */}
        {showDiagnosticPanel && searchDiagnostic && (
          <div className="p-3.5 bg-black/85 text-zinc-200 border-b border-zinc-700 text-xs space-y-2 animate-fade-in font-mono">
            <div className="flex items-center justify-between font-bold text-zinc-100">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Search Diagnostics</span>
              </span>
              <button
                onClick={() => setShowDiagnosticPanel(false)}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-400 text-[10px]">Provider</div>
                <div className="font-bold uppercase text-white">{searchDiagnostic.provider}</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-400 text-[10px]">HTTP Status</div>
                <div className={`font-bold ${searchDiagnostic.httpStatus === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {searchDiagnostic.httpStatus ? `HTTP ${searchDiagnostic.httpStatus}` : 'Network / Abort'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-400 text-[10px]">Latency</div>
                <div className="font-bold text-white">{searchDiagnostic.durationMs} ms</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-400 text-[10px]">Raw / Rendered</div>
                <div className="font-bold text-white">
                  {searchDiagnostic.rawResultsCount} raw → {searchResults.length} shown
                </div>
              </div>
            </div>
            {searchDiagnostic.errorMessage && (
              <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-[11px]">
                <strong>Error: </strong>{searchDiagnostic.errorMessage}
              </div>
            )}
            {searchDiagnostic.fallbackAttempted && (
              <div className="text-[11px] text-amber-300">
                Automatic fallback: {searchDiagnostic.fallbackSucceeded ? `Engaged ${searchDiagnostic.fallbackSource || 'OMDb'}` : 'Attempted, no fallback matches'}
              </div>
            )}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {/* Explicit Error State Banner */}
          {!isSearching && searchError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-2 mb-2 animate-fade-in shadow-xs">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Search Provider Issue: {providerMode.toUpperCase()}</span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {searchError}
              </p>
              <div className="flex items-center gap-2 pt-1">
                {false && (
                  <button
                    type="button"
                    onClick={() => setProviderMode('auto')}
                    className="px-3 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold text-xs hover:opacity-90 transition active:scale-95"
                  >
                    Switch to Auto Fallback
                  </button>
                )}
                {providerMode !== 'omdb' && (
                  <button
                    type="button"
                    onClick={() => setProviderMode('omdb')}
                    className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition active:scale-95"
                  >
                    Try OMDb Provider
                  </button>
                )}
              </div>
            </div>
          )}

          {!query.trim() && (
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1 mb-2">
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
                      fallbackSrc={item.fallbackPosterUrl}
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
                      {item.originalTitle && item.originalTitle.trim().toLowerCase() !== item.title.trim().toLowerCase() && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[140px] opacity-75 font-normal italic" title={`Original title: ${item.originalTitle}`}>
                            {item.originalTitle}
                          </span>
                        </>
                      )}
                      {item.imdbRating && item.imdbRating > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent-primary)]">
                            <Star className="w-3 h-3 fill-current text-amber-500" />
                            {item.imdbRating.toFixed(1)}
                            {item.voteCount && item.voteCount > 0 ? (
                              <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-0.5">
                                ({item.voteCount >= 1000 ? `${(item.voteCount / 1000).toFixed(1)}k` : item.voteCount})
                              </span>
                            ) : null}
                          </span>
                        </>
                      ) : (item.imdbRating || 0) > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent-primary)]">
                            <Star className="w-3 h-3 fill-current text-[var(--accent-secondary)]" />
                            {(item.imdbRating || 0).toFixed(1)}
                            {item.voteCount && item.voteCount > 0 ? (
                              <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-0.5">
                                ({item.voteCount >= 1000 ? `${(item.voteCount / 1000).toFixed(1)}k` : item.voteCount})
                              </span>
                            ) : null}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {/* Provider representation dots and max 2 genres */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {item.metadataSource === 'tmdb' || item.tmdbId ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-800 inline-block shrink-0" title="TMDB Source" />
                      ) : item.metadataSource === 'omdb' || item.imdbId ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-800 inline-block shrink-0" title="OMDb Source" />
                      ) : null}
                      {item.genres && item.genres.slice(0, 2).map(g => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-[10px] font-bold"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
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
                        ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)]'
                        : isWatching
                        ? 'bg-[var(--modal-bg)] text-[var(--accent-primary)] border-2 border-[var(--accent-primary)]'
                        : 'bg-[var(--chip-bg)] hover:opacity-90 text-[var(--text-primary)] border border-[var(--border-subtle)]'
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
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No matching movies or series found.
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Try searching for another movie title, actor, or genre.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
