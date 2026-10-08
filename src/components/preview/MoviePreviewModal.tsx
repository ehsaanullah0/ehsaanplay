import React, { useState, useEffect } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
} from '../../types/movie';
import { KNOWN_TV_SHOWS_METADATA } from '../../services/tmdb';
import { SafeImage } from '../common/SafeImage';
import { StarRating } from '../common/StarRating';
import { StreamingBrandIcon } from '../common/StreamingBrandIcon';
import {
  X,
  ArrowLeft,
  Bookmark,
  Check,
  Heart,
  Star,
  Play,
  Tv,
  Film,
  Plus,
  ChevronDown,
  ChevronUp,
  Sliders,
  Pencil,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  User,
  Users,
  FileText,
  FolderPlus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export type PreviewCardId =
  | 'journal'
  | 'episodes'
  | 'overview'
  | 'production'
  | 'where_to_watch'
  | 'cast_crew';

export interface PreviewCardItem {
  id: PreviewCardId;
  label: string;
  description: string;
  visible: boolean;
}

const DEFAULT_CARD_SECTIONS: PreviewCardItem[] = [
  {
    id: 'journal',
    label: 'Personal Rating & Reflections',
    description: 'Star rating, watch progress slider, and personal reflections note',
    visible: true,
  },
  {
    id: 'episodes',
    label: 'Episodes & Seasons (TV)',
    description: 'Episode checklist and season tabs for TV series',
    visible: true,
  },
  {
    id: 'overview',
    label: 'Story Overview',
    description: 'Plot synopsis and storyline summary',
    visible: true,
  },
  {
    id: 'production',
    label: 'Production Details',
    description: 'Release date, runtime, budget, box office, and studio info',
    visible: true,
  },
  {
    id: 'where_to_watch',
    label: 'Where to Watch',
    description: 'Streaming providers, rent, and purchase availability',
    visible: true,
  },
  {
    id: 'cast_crew',
    label: 'Top Cast & Crew',
    description: 'Featured actors and key production crew profiles',
    visible: true,
  },
];

export interface HeroCustomizerConfig {
  artOn: boolean;
  opacity: number;
  showTitleBackgroundCard: boolean;
  showTaglineQuote: boolean;
  showGenrePills: boolean;
  showMatchScore: boolean;
  showRatingBadge: boolean;
  showHDQualityBadge: boolean;
  showWatchTrailerButton: boolean;
  showSynopsisInHero: boolean;
  showStreamingProviders: boolean;
  showWatchlistButton: boolean;
  showWatchedButton: boolean;
  showFavoriteButton: boolean;
  showAddToListButton: boolean;
  buttonDisplayMode: 'full' | 'icon';
}

const DEFAULT_HERO_CUSTOMIZER: HeroCustomizerConfig = {
  artOn: true,
  opacity: 1.0,
  showTitleBackgroundCard: false,
  showTaglineQuote: true,
  showGenrePills: true,
  showMatchScore: false,
  showRatingBadge: true,
  showHDQualityBadge: false,
  showWatchTrailerButton: true,
  showSynopsisInHero: false,
  showStreamingProviders: false,
  showWatchlistButton: true,
  showWatchedButton: true,
  showFavoriteButton: true,
  showAddToListButton: true,
  buttonDisplayMode: 'full',
};

const PREVIEW_SECTIONS_STORAGE_KEY = 'ehsaan_preview_cards_order_v2';
const HERO_CUSTOMIZER_STORAGE_KEY = 'ehsaan_hero_customizer_v1';

interface MoviePreviewModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  userState?: PersonalMediaState;
  customLists: CustomList[];
  backdropOpacity: number;
  onHydrateDetails?: (item: MediaItem) => Promise<MediaItem | undefined>;
  onToggleWatchlist: (id: string, item?: MediaItem) => void;
  onToggleWatched: (id: string, item?: MediaItem) => void;
  onToggleFavorite: (id: string, item?: MediaItem) => void;
  onSetRating: (id: string, rating: number) => void;
  onSetNotes: (id: string, notes: string) => void;
  onSetProgress: (id: string, progress: number, item?: MediaItem) => void;
  onToggleTVEpisode: (id: string, season: number, episode: number, item?: MediaItem) => void;
  onToggleSeasonEpisodes?: (id: string, season: number, episodeNumbers: number[], forceMarkDone: boolean, item?: MediaItem) => void;
  onAddItemToList: (listId: string, mediaId: string) => void;
}

export const MoviePreviewModal: React.FC<MoviePreviewModalProps> = ({
  item: initialItem,
  isOpen,
  onClose,
  userState,
  customLists,
  backdropOpacity: defaultOpacity,
  onHydrateDetails,
  onToggleWatchlist,
  onToggleWatched,
  onToggleFavorite,
  onSetRating,
  onSetNotes,
  onSetProgress,
  onToggleTVEpisode,
  onToggleSeasonEpisodes,
  onAddItemToList,
}) => {
  const [item, setItem] = useState<MediaItem | null>(initialItem);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [notesDraft, setNotesDraft] = useState(userState?.notes || '');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showRearrangeModal, setShowRearrangeModal] = useState(false);

  // Load customizable hero options
  const [heroCustomizer, setHeroCustomizer] = useState<HeroCustomizerConfig>(() => {
    try {
      const saved = localStorage.getItem(HERO_CUSTOMIZER_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_HERO_CUSTOMIZER, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_HERO_CUSTOMIZER;
  });

  const updateHeroCustomizer = (partial: Partial<HeroCustomizerConfig>) => {
    setHeroCustomizer(prev => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(HERO_CUSTOMIZER_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Load customizable card section order
  const [cardSections, setCardSections] = useState<PreviewCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(PREVIEW_SECTIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CARD_SECTIONS.length) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_CARD_SECTIONS;
  });

  // Save changes to localStorage
  const saveSections = (newSections: PreviewCardItem[]) => {
    setCardSections(newSections);
    try {
      localStorage.setItem(PREVIEW_SECTIONS_STORAGE_KEY, JSON.stringify(newSections));
    } catch {
      // ignore
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cardSections.length) return;

    const copy = [...cardSections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    saveSections(copy);
  };

  const toggleSectionVisibility = (id: PreviewCardId) => {
    const updated = cardSections.map(s => (s.id === id ? { ...s, visible: !s.visible } : s));
    saveSections(updated);
  };

  const resetSectionOrder = () => {
    saveSections(DEFAULT_CARD_SECTIONS);
  };

  // Sync item and trigger real-time rich details hydration
  useEffect(() => {
    setItem(initialItem);
    setNotesDraft(userState?.notes || '');
    setIsPlayingTrailer(false);
    setIsOverviewExpanded(false);

    if (initialItem && onHydrateDetails) {
      if (!initialItem.cast?.length || !initialItem.providers?.length || initialItem.type === 'tv') {
        onHydrateDetails(initialItem).then(enriched => {
          if (enriched) {
            setItem(enriched);
          }
        });
      }
    }
  }, [initialItem, userState?.notes, onHydrateDetails]);

  // Providers fallback & intelligent deduplication (called unconditionally before early return)
  const cleanedProviders = React.useMemo(() => {
    const rawProviders = (item?.providers && item.providers.length > 0)
      ? item.providers
      : [{ name: 'Netflix', type: 'stream' as const }];

    const seen = new Set<string>();
    const list: Array<{ name: string; type: 'stream' | 'rent' | 'buy' }> = [];

    for (const p of rawProviders) {
      let displayName = p.name;
      if (displayName.toLowerCase().includes('netflix') && displayName.toLowerCase().includes('ads')) {
        displayName = 'Netflix (with Ads)';
      }
      const key = `${displayName.toLowerCase()}_${p.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ ...p, name: displayName });
      }
    }
    return list.slice(0, 6);
  }, [item?.providers]);

  if (!isOpen || !item) return null;

  const isWatched = !!userState?.isWatched;
  const inWatchlist = !!userState?.inWatchlist;
  const isFavorite = !!userState?.isFavorite;
  const progressPercent = userState?.progressPercent || 0;
  const isWatching = !isWatched && progressPercent > 0;
  const personalRating = userState?.personalRating || 0;

  // TV Episode and season calculations (Prioritizes accurate known metadata over outdated cache)
  const knownMeta = item.type === 'tv' && item.tmdbId ? KNOWN_TV_SHOWS_METADATA[item.tmdbId] : undefined;
  const seasonsList = (item.seasons && item.seasons.length > 0)
    ? (knownMeta?.seasons && knownMeta.seasons.length > item.seasons.length ? knownMeta.seasons : item.seasons)
    : (knownMeta?.seasons || []);
  const seasonsCount = item.type === 'tv'
    ? Math.max(
        item.seasons?.length || 0,
        item.seasonsCount || 0,
        knownMeta?.seasonsCount || 0,
        seasonsList.length || 0,
        1
      )
    : undefined;
  const totalEpisodesCount = item.type === 'tv'
    ? Math.max(
        item.episodesCount || 0,
        knownMeta?.episodesCount || 0,
        seasonsList.reduce((acc, s) => acc + (s.episodeCount || 0), 0),
        (seasonsCount || 1) * 8
      )
    : undefined;
  const currentSeasonInfo = seasonsList.find(s => s.seasonNumber === selectedSeason);
  const episodesPerSeason = currentSeasonInfo
    ? currentSeasonInfo.episodeCount
    : (seasonsCount && totalEpisodesCount ? Math.ceil(totalEpisodesCount / seasonsCount) : 8);

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1` : '';
  };

  const embedUrl = getYoutubeEmbedUrl(item.trailerUrl);

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[var(--modal-bg)] overflow-y-auto text-[var(--text-primary)] animate-fade-in flex flex-col">
      
      {/* ========================================================================= */}
      {/* CINEMATIC HERO SECTION (Artwork visible only for tablet & desktop screens) */}
      {/* ========================================================================= */}
      <div className={`relative w-full min-h-[340px] sm:min-h-[540px] md:min-h-[620px] lg:min-h-[680px] flex flex-col justify-between shrink-0 border-b border-[var(--border-subtle)] transition-colors ${
        heroCustomizer.artOn ? 'bg-[var(--modal-bg)] sm:bg-[#000000]' : 'bg-[var(--modal-bg)]'
      }`}>
        
        {/* Backdrop Image Layer (Turned off on mobile screens < sm, visible for tablet and desktop >= sm) */}
        {heroCustomizer.artOn && (
          <div className="absolute inset-0 z-0 overflow-hidden hidden sm:block bg-[#000000]">
            <SafeImage
              src={item.backdropUrl || item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: heroCustomizer.opacity }}
            />
            {/* Directional gradient shadow for text legibility and deep dark fog */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30 sm:bg-[linear-gradient(to_right,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.65)_45%,rgba(0,0,0,0.3)_75%,rgba(0,0,0,0.15)_100%)] pointer-events-none"
            />
          </div>
        )}

        {/* Top Floating Action Bar */}
        <div className="relative z-20 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-3.5 sm:py-4 flex items-center justify-between">
          {/* Left: Back button + Production label */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              aria-label="Back to library"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition border active:scale-95 shadow-xs ${
                heroCustomizer.artOn
                  ? 'bg-[var(--chip-bg)] sm:bg-black/50 hover:bg-[var(--chip-bg)]/80 sm:hover:bg-black/70 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/15 sm:backdrop-blur-md'
                  : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
              }`}
            >
              <ArrowLeft className={`w-4 h-4 ${heroCustomizer.artOn ? 'text-[var(--accent-primary)] sm:text-white' : 'text-[var(--accent-primary)]'}`} />
              <span>Back</span>
            </button>

            {item.productionCompany && (
              <span className={`hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold border truncate max-w-[280px] ${
                heroCustomizer.artOn
                  ? 'bg-black/50 text-white/90 backdrop-blur-md border-white/15'
                  : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
              }`}>
                {item.productionCompany}
              </span>
            )}
          </div>

          {/* Right: Customizer Tool, Rearrange Tool, Favorite, Close button */}
          <div className="flex items-center gap-2">
            {/* ADD TO LIST TRIGGER (ICON ONLY) */}
            {heroCustomizer.showAddToListButton !== false && (
              <div className="relative hidden sm:inline-block">
                <button
                  onClick={() => setIsAddingToList(!isAddingToList)}
                  aria-label="Add to Collection List"
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                    heroCustomizer.artOn
                      ? 'bg-[var(--chip-bg)] sm:bg-black/50 hover:bg-[var(--chip-bg)]/80 sm:hover:bg-black/70 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/15 sm:backdrop-blur-md'
                      : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
                  } ${isAddingToList ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  title="Add to Collection List"
                >
                  <FolderPlus className={`w-4 h-4 ${heroCustomizer.artOn ? 'text-[var(--accent-primary)] sm:text-white' : 'text-[var(--accent-primary)]'}`} />
                </button>

                {isAddingToList && (
                  <div className="absolute top-full mt-2 right-0 w-60 p-2.5 rounded-2xl bg-[var(--modal-bg)] text-[var(--text-primary)] shadow-2xl border border-[var(--border-subtle)] z-50 animate-fade-in text-left">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-2 py-1 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-1.5">
                      <span>Add to Collection</span>
                      <button
                        onClick={() => setIsAddingToList(false)}
                        className="p-0.5 rounded hover:text-[var(--text-primary)] text-[var(--text-secondary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-52 overflow-y-auto no-scrollbar">
                      {customLists.map(list => {
                        const alreadyIn = list.itemIds.includes(item.id);
                        return (
                          <button
                            key={list.id}
                            disabled={alreadyIn}
                            onClick={() => {
                              onAddItemToList(list.id, item.id);
                              setIsAddingToList(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                              alreadyIn
                                ? 'text-[var(--text-secondary)] opacity-60 cursor-not-allowed bg-[var(--chip-bg)]/40'
                                : 'hover:bg-[var(--chip-bg)] text-[var(--text-primary)]'
                            }`}
                          >
                            <span className="truncate">{list.title}</span>
                            {alreadyIn && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW CUSTOMIZER TRIGGER (ICON ONLY) */}
            <div className="relative">
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                aria-label="Preview Customizer"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                  heroCustomizer.artOn
                    ? 'bg-[var(--chip-bg)] sm:bg-black/50 hover:bg-[var(--chip-bg)]/80 sm:hover:bg-black/70 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/15 sm:backdrop-blur-md'
                    : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
                }`}
                title="Preview Customizer"
              >
                <Sliders className={`w-4 h-4 ${heroCustomizer.artOn ? 'text-[var(--accent-primary)] sm:text-white' : 'text-[var(--accent-primary)]'}`} />
              </button>

              {/* PREVIEW CUSTOMIZER POPUP CARD */}
              {showCustomizer && (
                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-84 max-w-sm sm:max-w-none max-h-[80vh] sm:max-h-[540px] overflow-y-auto p-5 bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] z-50 animate-fade-in no-scrollbar mx-auto sm:mx-0">
                  {/* Header: Title + Art On / Off */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span className="text-xs font-black tracking-wider uppercase text-[var(--text-primary)]">
                        PREVIEW CUSTOMIZER
                      </span>
                    </div>

                    <button
                      onClick={() => updateHeroCustomizer({ artOn: !heroCustomizer.artOn })}
                      className={`px-3 py-1 rounded-full text-xs font-black transition ${
                        heroCustomizer.artOn
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                          : 'bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {heroCustomizer.artOn ? 'ART ON' : 'ART OFF'}
                    </button>
                  </div>

                  {/* Backdrop Opacity Range */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                      <span>Backdrop Opacity:</span>
                      <span className="text-[var(--accent-primary)] font-mono font-bold">
                        {heroCustomizer.artOn ? `${Math.round(heroCustomizer.opacity * 100)}%` : '0%'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={heroCustomizer.artOn ? heroCustomizer.opacity : 0}
                      onChange={e => updateHeroCustomizer({ opacity: Number(e.target.value) })}
                      disabled={!heroCustomizer.artOn}
                      className="w-full h-2 bg-[var(--chip-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)] disabled:opacity-30"
                    />
                  </div>

                  {/* ACTION BUTTON CONTROLS */}
                  <div className="border-t border-[var(--border-subtle)] my-4" />
                  <div className="text-[11px] font-black text-[var(--text-secondary)] tracking-wider uppercase mb-3">
                    ACTION BUTTONS (STYLE & VISIBILITY):
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Button Display Mode: Full Text vs Icon Only */}
                    <div className="flex items-center justify-between py-1 bg-[var(--chip-bg)] p-2.5 rounded-2xl border border-[var(--border-subtle)]">
                      <span className="font-bold text-[var(--text-primary)]">Button Format</span>
                      <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-full text-xs">
                        <button
                          onClick={() => updateHeroCustomizer({ buttonDisplayMode: 'full' })}
                          className={`px-3 py-1 rounded-full font-bold transition ${
                            (heroCustomizer.buttonDisplayMode || 'full') === 'full'
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Full Text
                        </button>
                        <button
                          onClick={() => updateHeroCustomizer({ buttonDisplayMode: 'icon' })}
                          className={`px-3 py-1 rounded-full font-bold transition ${
                            heroCustomizer.buttonDisplayMode === 'icon'
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Icon Only
                        </button>
                      </div>
                    </div>

                    {/* Show/Hide Favorite */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Favorite Button</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showFavoriteButton: heroCustomizer.showFavoriteButton === false ? true : false })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showFavoriteButton !== false
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showFavoriteButton !== false ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* Show/Hide Add to List */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Add to List Button</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showAddToListButton: heroCustomizer.showAddToListButton === false ? true : false })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showAddToListButton !== false
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showAddToListButton !== false ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* Show/Hide Watched/Watching */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Watched / Watching Button</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showWatchedButton: heroCustomizer.showWatchedButton === false ? true : false })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showWatchedButton !== false
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showWatchedButton !== false ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* Show/Hide Watchlist */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Watchlist Button</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showWatchlistButton: heroCustomizer.showWatchlistButton === false ? true : false })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showWatchlistButton !== false
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showWatchlistButton !== false ? 'Show' : 'Hide'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-subtle)] my-4" />

                  {/* TOGGLE HERO ELEMENTS LIST */}
                  <div className="text-[11px] font-black text-[var(--text-secondary)] tracking-wider uppercase mb-3">
                    TOGGLE HERO ELEMENTS:
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* 1. Title Background Card */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Title Background Card</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showTitleBackgroundCard: !heroCustomizer.showTitleBackgroundCard })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showTitleBackgroundCard
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showTitleBackgroundCard ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 2. Tagline Quote */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Tagline Quote</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showTaglineQuote: !heroCustomizer.showTaglineQuote })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showTaglineQuote
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showTaglineQuote ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 3. Genre Pills in Hero */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Genre Pills in Hero</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showGenrePills: !heroCustomizer.showGenrePills })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showGenrePills
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showGenrePills ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 4. % Match Score */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">% Match Score</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showMatchScore: !heroCustomizer.showMatchScore })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showMatchScore
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showMatchScore ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 5. ★ Rating Badge */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">★ Rating Badge</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showRatingBadge: !heroCustomizer.showRatingBadge })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showRatingBadge
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showRatingBadge ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 6. HD Quality Badge */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">HD Quality Badge</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showHDQualityBadge: !heroCustomizer.showHDQualityBadge })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showHDQualityBadge
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showHDQualityBadge ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 7. Watch Trailer Button */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Watch Trailer Button</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showWatchTrailerButton: !heroCustomizer.showWatchTrailerButton })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showWatchTrailerButton
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showWatchTrailerButton ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 8. Synopsis in Hero */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Synopsis in Hero</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showSynopsisInHero: !heroCustomizer.showSynopsisInHero })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showSynopsisInHero
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showSynopsisInHero ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 9. Streaming Providers */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Streaming Providers</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showStreamingProviders: !heroCustomizer.showStreamingProviders })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showStreamingProviders
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {heroCustomizer.showStreamingProviders ? 'Show' : 'Hide'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PENCIL ICON: REARRANGE & CUSTOMIZE CARDS */}
            <button
              onClick={() => setShowRearrangeModal(true)}
              aria-label="Rearrange cards"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                heroCustomizer.artOn
                  ? 'bg-[var(--chip-bg)] sm:bg-black/50 hover:bg-[var(--chip-bg)]/80 sm:hover:bg-black/70 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/15 sm:backdrop-blur-md'
                  : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
              }`}
              title="Rearrange & Customize Cards Order"
            >
              <Pencil className={`w-4 h-4 ${heroCustomizer.artOn ? 'text-[var(--accent-primary)] sm:text-white' : 'text-[var(--accent-primary)]'}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close preview"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                heroCustomizer.artOn
                  ? 'bg-[var(--chip-bg)] sm:bg-black/50 hover:bg-[var(--chip-bg)]/80 sm:hover:bg-black/70 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/15 sm:backdrop-blur-md'
                  : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
              }`}
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Embedded Trailer Player (if playing) */}
        {isPlayingTrailer && embedUrl ? (
          <div className="relative aspect-video w-full max-w-6xl mx-auto bg-black z-20 my-4 rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src={embedUrl}
              title={`${item.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
            <button
              onClick={() => setIsPlayingTrailer(false)}
              className="absolute top-4 right-4 px-4 py-1.5 rounded-full bg-black/80 text-white text-xs font-semibold hover:bg-black"
            >
              Close Video
            </button>
          </div>
        ) : (
          /* Hero Content Area: Left-Anchored Poster & Left-Aligned Information */
          <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16 pb-6 sm:pb-8 pt-2 sm:pt-4 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-8">
            {/* Anchored Left Poster / Album Artwork */}
            <div className={`w-40 xs:w-44 sm:w-48 md:w-56 flex-none aspect-[2/3] rounded-2xl overflow-hidden shadow-sm sm:shadow-2xl border select-none transition-transform duration-300 hover:scale-[1.02] relative self-start ${
              heroCustomizer.artOn
                ? 'bg-[var(--bg-surface-elevated)] sm:bg-[#24291B] border-[var(--border-subtle)] sm:border-white/25'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
            }`}>
              <SafeImage
                src={item.posterUrl || item.backdropUrl}
                alt={item.title}
                fallbackTitle={item.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Hero Information Hierarchy */}
            <div
              className={`flex-1 min-w-0 flex flex-col items-start text-left w-full transition-all ${
                heroCustomizer.showTitleBackgroundCard
                  ? heroCustomizer.artOn
                    ? 'p-4 sm:p-6 rounded-3xl bg-[var(--chip-bg)] sm:bg-black/60 sm:backdrop-blur-md border border-[var(--border-subtle)] sm:border-white/15 shadow-sm sm:shadow-xl'
                    : 'p-4 sm:p-6 rounded-3xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] shadow-sm'
                  : ''
              }`}
            >
              {/* Media Type & Metadata Line (Cleanly on top of title) */}
              <div className={`flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider mb-1 ${
                heroCustomizer.artOn
                  ? 'text-[var(--text-secondary)] sm:text-white/90'
                  : 'text-[var(--text-secondary)]'
              }`}>
                <span className="flex items-center gap-1">
                  {item.type === 'tv' ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                  {item.type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{item.year || '2025'}</span>
                {item.runtime ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{Math.floor(item.runtime / 60)}H {item.runtime % 60}M</span>
                  </>
                ) : null}
                {seasonsCount ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{seasonsCount > 1 ? `${seasonsCount} SEASONS` : '1 SEASON'}</span>
                  </>
                ) : null}
              </div>

              {/* Primary Title (Bold, Left-Aligned) */}
              <h1 className={`text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-[1.18] sm:leading-[1.12] text-left ${
                heroCustomizer.artOn
                  ? 'text-[var(--text-primary)] sm:text-white'
                  : 'text-[var(--text-primary)]'
              }`}>
                {item.title}
              </h1>

              {/* Tagline Quote */}
              {heroCustomizer.showTaglineQuote && item.tagline && (
                <p className={`mt-1 text-xs sm:text-sm italic line-clamp-2 text-left ${
                  heroCustomizer.artOn
                    ? 'text-[var(--text-secondary)] sm:text-white/85'
                    : 'text-[var(--text-secondary)]'
                }`}>
                  "{item.tagline}"
                </p>
              )}

              {/* Genre Pills */}
              {heroCustomizer.showGenrePills && (
                <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5">
                  {(item.genres && item.genres.length > 0 ? item.genres : ['Animation', 'Action', 'Fantasy']).map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border border-[var(--border-subtle)] text-xs font-bold shadow-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Rating Row (★ 8.8 / 10 + votes + Trailer button) */}
              <div className="mt-3.5 flex flex-wrap items-center justify-start gap-2.5">
                {/* 1. Rating Pill Badge */}
                {heroCustomizer.showRatingBadge && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${
                    heroCustomizer.artOn
                      ? 'bg-[var(--chip-bg)] sm:bg-black/60 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/20'
                      : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}>
                    <Star className="w-3.5 h-3.5 fill-[var(--accent-primary)] text-[var(--accent-primary)]" />
                    <span className="tabular-nums font-black">{item.tmdbRating > 0 ? item.tmdbRating.toFixed(1) : '8.8'} / 10</span>
                  </span>
                )}

                {/* Vote Count */}
                {item.voteCount > 0 ? (
                  <span className={`text-xs font-medium tabular-nums ${
                    heroCustomizer.artOn
                      ? 'text-[var(--text-secondary)] sm:text-white/70'
                      : 'text-[var(--text-secondary)]'
                  }`}>
                    ({item.voteCount.toLocaleString()} votes)
                  </span>
                ) : (
                  <span className={`text-xs font-medium tabular-nums ${
                    heroCustomizer.artOn
                      ? 'text-[var(--text-secondary)] sm:text-white/70'
                      : 'text-[var(--text-secondary)]'
                  }`}>
                    (2,230 votes)
                  </span>
                )}

                {/* % Match Score Badge (Optional) */}
                {heroCustomizer.showMatchScore && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] border border-[var(--border-subtle)] text-xs font-extrabold shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>{Math.min(99, Math.max(82, Math.round((item.tmdbRating || 7.5) * 10 + 12)))}% Match</span>
                  </span>
                )}

                {/* HD Quality Badge (Optional) */}
                {heroCustomizer.showHDQualityBadge && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                    heroCustomizer.artOn
                      ? 'bg-[var(--chip-bg)] sm:bg-black/60 text-[var(--text-primary)] sm:text-white/90 border-[var(--border-subtle)] sm:border-white/20'
                      : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}>
                    4K Ultra HD
                  </span>
                )}

                {/* Watch Trailer Button in Rating Row */}
                {heroCustomizer.showWatchTrailerButton && item.trailerUrl && !isPlayingTrailer && (
                  <button
                    onClick={() => setIsPlayingTrailer(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95 ml-auto sm:ml-0"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                    <span>Trailer</span>
                  </button>
                )}
              </div>

              {/* Optional Synopsis in Hero */}
              {heroCustomizer.showSynopsisInHero && item.overview && (
                <p className={`mt-3 text-xs sm:text-sm line-clamp-2 max-w-2xl leading-relaxed text-left ${
                  heroCustomizer.artOn
                    ? 'text-[var(--text-secondary)] sm:text-white/85'
                    : 'text-[var(--text-secondary)]'
                }`}>
                  {item.overview}
                </p>
              )}

              {/* Optional Streaming Providers in Hero */}
              {heroCustomizer.showStreamingProviders && (
                <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
                  {cleanedProviders.slice(0, 3).map((p, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        heroCustomizer.artOn
                          ? 'bg-[var(--chip-bg)] sm:bg-black/60 text-[var(--text-primary)] sm:text-white border-[var(--border-subtle)] sm:border-white/20'
                          : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      <StreamingBrandIcon name={p.name} className="w-3.5 h-3.5 rounded-sm" />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hero Action Buttons (Configurable Full text vs Icon Only, and visibility toggles) */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3 w-full">
                {/* 1. Add to Watchlist */}
                {heroCustomizer.showWatchlistButton !== false && (
                  <button
                    onClick={() => onToggleWatchlist(item.id, item)}
                    title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    aria-label={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    className={`inline-flex items-center justify-center transition shadow-xs active:scale-95 ${
                      heroCustomizer.buttonDisplayMode === 'icon'
                        ? 'w-28 sm:w-36 h-11 px-4 rounded-full'
                        : 'w-11 h-11 sm:w-auto sm:px-4 sm:py-3 rounded-full text-xs font-bold gap-2'
                    } ${
                      inWatchlist
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''}`} />
                    {heroCustomizer.buttonDisplayMode !== 'icon' && (
                      <span className="hidden sm:inline">{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
                    )}
                  </button>
                )}

                {/* 2. Mark Watched */}
                {heroCustomizer.showWatchedButton !== false && (
                  <button
                    onClick={() => onToggleWatched(item.id, item)}
                    title={isWatched ? 'Watched' : isWatching ? `Watching (${progressPercent}%)` : 'Mark Watched'}
                    aria-label={isWatched ? 'Watched' : isWatching ? `Watching (${progressPercent}%)` : 'Mark Watched'}
                    className={`inline-flex items-center justify-center transition shadow-xs active:scale-95 ${
                      heroCustomizer.buttonDisplayMode === 'icon'
                        ? 'w-11 h-11 rounded-full'
                        : 'w-11 h-11 sm:w-auto sm:px-4 sm:py-3 rounded-full text-xs font-bold gap-2'
                    } ${
                      isWatched
                        ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border border-[var(--border-subtle)]'
                        : isWatching
                        ? 'bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)] border-2 border-[var(--accent-primary)]'
                        : 'bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    {heroCustomizer.buttonDisplayMode !== 'icon' && (
                      <span className="hidden sm:inline">{isWatched ? 'Watched' : isWatching ? `Watching (${progressPercent}%)` : 'Mark Watched'}</span>
                    )}
                  </button>
                )}

                {/* 3. Favorite */}
                {heroCustomizer.showFavoriteButton !== false && (
                  <button
                    onClick={() => onToggleFavorite(item.id, item)}
                    title={isFavorite ? 'Favorited' : 'Favorite'}
                    aria-label={isFavorite ? 'Favorited' : 'Favorite'}
                    className={`inline-flex items-center justify-center transition shadow-xs active:scale-95 ${
                      heroCustomizer.buttonDisplayMode === 'icon'
                        ? 'w-11 h-11 rounded-full'
                        : 'w-11 h-11 sm:w-auto sm:px-4 sm:py-3 rounded-full text-xs font-bold gap-2 font-black'
                    } ${
                      isFavorite
                        ? 'bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] border border-[var(--border-subtle)]'
                        : 'bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-[var(--text-card-yellow)]' : ''}`} />
                    {heroCustomizer.buttonDisplayMode !== 'icon' && (
                      <span className="hidden sm:inline">{isFavorite ? 'Favorited' : 'Favorite'}</span>
                    )}
                  </button>
                )}

                {/* 4. Add to List (Mobile view fallback when desktop has top-right icon) */}
                {heroCustomizer.showAddToListButton !== false && (
                  <div className="relative sm:hidden">
                    <button
                      onClick={() => setIsAddingToList(!isAddingToList)}
                      title="Add to Collection List"
                      aria-label="Add to Collection List"
                      className="w-11 h-11 rounded-full inline-flex items-center justify-center transition active:scale-95 shadow-xs border border-[var(--border-subtle)] bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    {isAddingToList && (
                      <div className="absolute bottom-full mb-2 left-0 w-60 p-2.5 rounded-2xl bg-[var(--modal-bg)] shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] z-50 animate-fade-in text-left">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-2 py-1 flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5 mb-1">
                          <span>Select Collection</span>
                          <button onClick={() => setIsAddingToList(false)} className="p-0.5 text-[var(--text-secondary)]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                          {customLists.map(list => {
                            const alreadyIn = list.itemIds.includes(item.id);
                            return (
                              <button
                                key={list.id}
                                disabled={alreadyIn}
                                onClick={() => {
                                  onAddItemToList(list.id, item.id);
                                  setIsAddingToList(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                                  alreadyIn
                                    ? 'text-[var(--text-secondary)] opacity-60'
                                    : 'hover:bg-[var(--chip-bg)] text-[var(--text-primary)]'
                                }`}
                              >
                                <span className="truncate">{list.title}</span>
                                {alreadyIn && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Divider Line below Hero */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="border-t border-[var(--border-subtle)] mt-2 mb-2" />
      </div>

      {/* ========================================================================= */}
      {/* CONTENT AREA: Dynamic Configurable Cards Order                            */}
      {/* ========================================================================= */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-6 space-y-6 flex-1">
        
        {cardSections.map((section) => {
          if (!section.visible) return null;

          // 1. Personal Rating & Reflections Card (FULL WIDTH)
          if (section.id === 'journal') {
            return (
              <div key="journal" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-2 border-b border-[var(--border-subtle)]">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                      YOUR PERSONAL RATING
                    </label>
                    <StarRating
                      value={personalRating}
                      onChange={r => onSetRating(item.id, r)}
                      size="md"
                      layout="stacked"
                    />
                  </div>

                  {/* Watch Progress Slider */}
                  <div className="w-full sm:w-80">
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                      <span className="font-black uppercase tracking-wider">PROGRESS</span>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="relative w-full py-1 flex items-center select-none">
                      {/* Thick M3 Tactile Track */}
                      <div className="relative w-full h-3 rounded-full flex items-center overflow-hidden bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                        <div
                          className="h-full bg-[var(--accent-primary)] transition-all duration-75 rounded-l-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                        <div className="h-full flex-1 bg-[var(--chip-bg)] relative">
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]/35" />
                        </div>
                      </div>

                      {/* M3 Vertical Pill Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75 flex items-center justify-center z-10"
                        style={{ left: `${progressPercent}%` }}
                      >
                        <div className="w-1.5 h-5 rounded-full bg-[var(--accent-primary)] shadow-sm ring-2 ring-[var(--bg-primary)]" />
                      </div>

                      {/* Native Range Input */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progressPercent}
                        onChange={e => onSetProgress(item.id, Number(e.target.value), item)}
                        aria-label="Watch progress"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>
                </div>

                {/* Improved Personal Notes & Reflections Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                      <label className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                        PERSONAL NOTES & REFLECTIONS
                      </label>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px]">
                      {isSavedFeedback && (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold animate-fade-in bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Saved to journal</span>
                        </span>
                      )}
                      <span className="text-[var(--text-secondary)] tabular-nums font-mono">
                        {notesDraft.trim() ? `${notesDraft.trim().split(/\s+/).length} words · ${notesDraft.length} chars` : '0 words'}
                      </span>
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)] focus-within:border-transparent transition-all p-3.5 sm:p-4">
                    <textarea
                      rows={4}
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                      onBlur={() => {
                        onSetNotes(item.id, notesDraft);
                        if (notesDraft.trim()) {
                          setIsSavedFeedback(true);
                          setTimeout(() => setIsSavedFeedback(false), 2200);
                        }
                      }}
                      placeholder="Write your personal reflections, memorable quotes, favorite scenes, or review notes on this title..."
                      className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs sm:text-sm leading-relaxed focus:outline-none resize-y min-h-[100px]"
                    />

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] mt-2">
                      <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                        <span>Auto-saves on blur · Stored locally</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {notesDraft.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Clear your personal reflection note for this title?')) {
                                setNotesDraft('');
                                onSetNotes(item.id, '');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#7F1D1D] hover:bg-[#991B1B] text-white shadow-xs transition active:scale-95"
                            title="Clear personal note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onSetNotes(item.id, notesDraft);
                            setIsSavedFeedback(true);
                            setTimeout(() => setIsSavedFeedback(false), 2500);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 2. TV SERIES EPISODES CHECKLIST (FULL WIDTH)
          if (section.id === 'episodes') {
            if (item.type !== 'tv') return null;
            
            const eps = Array.from({ length: episodesPerSeason }, (_, i) => i + 1);
            const isAllCompletedInSeason = eps.every(ep => !!userState?.tvProgress?.completedEpisodes[`s${selectedSeason}e${ep}`]);

            return (
              <div key="episodes" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      Episodes & Seasons
                    </h3>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
                      S{selectedSeason} · {eps.length} Eps
                    </span>
                    {onToggleSeasonEpisodes && (
                      <button
                        type="button"
                        onClick={() => onToggleSeasonEpisodes(item.id, selectedSeason, eps, !isAllCompletedInSeason, item)}
                        className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider transition-all active:scale-95 shadow-2xs border ${
                          isAllCompletedInSeason
                            ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border-[var(--border-subtle)]'
                            : 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent'
                        }`}
                      >
                        {isAllCompletedInSeason ? 'Unmark All' : 'Mark All'}
                      </button>
                    )}
                  </div>
                  {/* Season tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {Array.from({ length: seasonsCount || 1 }, (_, i) => i + 1).map(s => {
                      const totalSeasons = seasonsCount || 1;
                      const label = totalSeasons > 3 ? `S-${s}` : `Season ${s}`;
                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedSeason(s)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                            selectedSeason === s
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                              : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid of episodes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 pt-2">
                  {Array.from({ length: episodesPerSeason }, (_, i) => i + 1).map(ep => {
                    const epKey = `s${selectedSeason}e${ep}`;
                    const isDone = !!userState?.tvProgress?.completedEpisodes[epKey];

                    return (
                      <button
                        key={ep}
                        onClick={() => onToggleTVEpisode(item.id, selectedSeason, ep, item)}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium transition border active:scale-95 shadow-2xs ${
                          isDone
                            ? 'bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border-[var(--border-subtle)] font-bold'
                            : 'bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        <span>Ep. {ep}</span>
                        {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // 3. OVERVIEW & MERGED PRODUCTION DETAILS CARD
          if (section.id === 'overview' || section.id === 'production') {
            // Avoid duplicate rendering if both overview and production are enabled in cardSections
            if (section.id === 'production' && cardSections.some(s => s.id === 'overview' && s.visible)) {
              return null;
            }

            return (
              <div key="overview_merged" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-6">
                {/* Full Overview Paragraph */}
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 tracking-tight">
                    Overview
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                    {item.overview || 'No synopsis available for this title.'}
                  </p>
                </div>

                {/* Merged Production Details */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                    Production Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5 text-xs text-[var(--text-secondary)]">
                    {item.originalTitle && item.originalTitle !== item.title && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Original Title:</span>
                        <strong className="text-[var(--text-primary)] truncate ml-2">{item.originalTitle}</strong>
                      </div>
                    )}
                    {item.releaseDate && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Release Date:</span>
                        <strong className="text-[var(--text-primary)]">{item.releaseDate}</strong>
                      </div>
                    )}
                    {item.productionCompany && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Production:</span>
                        <strong className="text-[var(--text-primary)] truncate ml-2">{item.productionCompany}</strong>
                      </div>
                    )}
                    {item.country && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Country:</span>
                        <strong className="text-[var(--text-primary)]">{item.country}</strong>
                      </div>
                    )}
                    {item.budget && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Budget:</span>
                        <strong className="text-[var(--text-primary)]">{item.budget}</strong>
                      </div>
                    )}
                    {item.boxOffice && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Box Office:</span>
                        <strong className="text-[var(--text-primary)]">{item.boxOffice}</strong>
                      </div>
                    )}
                    {item.status && (
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span>Status:</span>
                        <strong className="text-[var(--text-primary)]">{item.status}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // 5. WHERE TO WATCH CARD (INDEPENDENT)
          if (section.id === 'where_to_watch') {
            return (
              <div key="where_to_watch" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      Where to Watch
                    </h3>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-1 rounded-full">
                      {cleanedProviders.length} Platform{cleanedProviders.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Clean structured grid of streaming platform tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {cleanedProviders.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StreamingBrandIcon name={p.name} className="w-6 h-6 rounded-lg shrink-0 shadow-xs" />
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {p.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                            p.type === 'stream'
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                              : p.type === 'rent'
                              ? 'bg-[var(--modal-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)]'
                              : 'bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)]'
                          }`}
                        >
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>Availability verified via TMDB</span>
                  <span className="font-semibold text-[var(--accent-primary)]">4K / HD Support</span>
                </div>
              </div>
            );
          }

          // 6. TOP CAST & CREW CARD (INDEPENDENT)
          if (section.id === 'cast_crew') {
            return (
              <div key="cast_crew" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      Top Cast & Crew
                    </h3>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-1 rounded-full">
                      {item.cast?.length || 0} Actors recorded
                    </span>
                  </div>

                  {/* Cast Members Grid with Profile Avatars */}
                  {(item.cast && item.cast.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {item.cast.slice(0, 6).map((c, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] shadow-2xs hover:bg-[var(--bg-surface-elevated)] transition"
                        >
                          {/* Cast Member Profile Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-surface-elevated)] shrink-0 border border-[var(--border-subtle)] flex items-center justify-center">
                            {c.profileUrl ? (
                              <SafeImage
                                src={c.profileUrl}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-[var(--text-secondary)]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[var(--text-primary)] truncate">{c.name}</div>
                            <div className="text-[11px] text-[var(--text-secondary)] truncate">{c.character}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[var(--chip-bg)] text-xs text-[var(--text-secondary)]">
                      Featured narrative cast & production crew recorded in journal.
                    </div>
                  )}
                </div>

                {/* Production Crew Row with Profile Avatars */}
                {item.crew && item.crew.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                      Key Production Crew
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {item.crew.slice(0, 4).map((cr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-surface-elevated)] shrink-0 border border-[var(--border-subtle)] flex items-center justify-center">
                            {cr.profileUrl ? (
                              <SafeImage
                                src={cr.profileUrl}
                                alt={cr.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-[var(--text-secondary)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-bold text-[var(--text-primary)] truncate">{cr.name}</div>
                            <div className="text-[10px] font-semibold text-[var(--accent-primary)] truncate uppercase tracking-wider">{cr.job}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* ========================================================================= */}
      {/* REARRANGE & CUSTOMIZE CARDS MODAL DIALOG                                  */}
      {/* ========================================================================= */}
      {showRearrangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-6 text-[var(--text-primary)] animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Rearrange Preview Cards
                </h2>
              </div>
              <button
                onClick={() => setShowRearrangeModal(false)}
                className="p-1.5 rounded-full hover:bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-3 mb-4">
              Reorder or toggle sections to personalize your movie and series preview window.
            </p>

            {/* Cards List */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {cardSections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    section.visible
                      ? 'bg-[var(--chip-bg)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
                      <span>{section.label}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                      {section.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Up Button */}
                    <button
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, 'up')}
                      className="p-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)] disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs border border-[var(--border-subtle)]"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down Button */}
                    <button
                      disabled={idx === cardSections.length - 1}
                      onClick={() => moveSection(idx, 'down')}
                      className="p-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)] disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs border border-[var(--border-subtle)]"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleSectionVisibility(section.id)}
                      className={`p-1.5 rounded-lg transition shadow-2xs ${
                        section.visible
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                          : 'bg-[var(--chip-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title={section.visible ? 'Hide section' : 'Show section'}
                    >
                      {section.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <button
                onClick={resetSectionOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <button
                onClick={() => setShowRearrangeModal(false)}
                className="px-5 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
