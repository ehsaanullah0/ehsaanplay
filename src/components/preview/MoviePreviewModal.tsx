import React, { useState, useEffect } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
} from '../../types/movie';
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
  onToggleWatchlist: (id: string) => void;
  onToggleWatched: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSetRating: (id: string, rating: number) => void;
  onSetNotes: (id: string, notes: string) => void;
  onSetProgress: (id: string, progress: number) => void;
  onToggleTVEpisode: (id: string, season: number, episode: number) => void;
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
  onAddItemToList,
}) => {
  const [item, setItem] = useState<MediaItem | null>(initialItem);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [notesDraft, setNotesDraft] = useState(userState?.notes || '');
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

  // TV Episode and season calculations
  const seasonsCount = item.type === 'tv' ? (item.seasonsCount || 1) : undefined;
  const totalEpisodesCount = item.type === 'tv' ? (item.episodesCount || (seasonsCount ? seasonsCount * 8 : 8)) : undefined;
  const episodesPerSeason = seasonsCount && totalEpisodesCount ? Math.ceil(totalEpisodesCount / seasonsCount) : 8;

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1` : '';
  };

  const embedUrl = getYoutubeEmbedUrl(item.trailerUrl);

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#F6F4E5] bg-[var(--bg-primary,#F6F4E5)] overflow-y-auto text-[#282C1B] animate-fade-in flex flex-col">
      
      {/* ========================================================================= */}
      {/* CINEMATIC HERO SECTION (Full-Width Dark Backdrop on Desktop, Clean on Mobile) */}
      {/* ========================================================================= */}
      <div className="relative w-full bg-[#F6F4E5] sm:bg-[#181B13] min-h-[380px] sm:min-h-[540px] md:min-h-[620px] lg:min-h-[680px] flex flex-col justify-between shrink-0 border-b border-[#4E562F]/10 sm:border-[#282C1B]/20">
        
        {/* Backdrop Image Layer (Controlled via Art On / Opacity - Available on both Mobile & Desktop) */}
        {heroCustomizer.artOn && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <SafeImage
              src={item.backdropUrl || item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: heroCustomizer.opacity }}
            />
            {/* Directional gradient shadow for text legibility on all devices */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 sm:bg-[linear-gradient(to_right,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.5)_45%,rgba(0,0,0,0.1)_75%,transparent_100%)]"
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EFECE1] sm:bg-black/50 hover:bg-[#E5E1D3] sm:hover:bg-black/70 text-[#282C1B] sm:text-[#FAF8F2] text-xs font-bold transition sm:backdrop-blur-md border border-[#4E562F]/10 sm:border-white/15 active:scale-95 shadow-xs sm:shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-[#4E562F] sm:text-[#E4EAB8]" />
              <span>Back</span>
            </button>

            {item.productionCompany && (
              <span className="hidden sm:inline-block px-3.5 py-1.5 rounded-full bg-black/50 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/15 truncate max-w-[280px]">
                {item.productionCompany}
              </span>
            )}
          </div>

          {/* Right: Customizer Tool (ICON ONLY), Rearrange Tool, Favorite, Close button */}
          <div className="flex items-center gap-2">
            {/* PREVIEW CUSTOMIZER TRIGGER (ICON ONLY) */}
            <div className="relative">
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                aria-label="Preview Customizer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFECE1] sm:bg-black/50 hover:bg-[#E5E1D3] sm:hover:bg-black/70 text-[#282C1B] sm:text-white flex items-center justify-center transition sm:backdrop-blur-md border border-[#4E562F]/10 sm:border-white/15 active:scale-95"
                title="Preview Customizer"
              >
                <Sliders className="w-4 h-4 text-[#4E562F] sm:text-[#E4EAB8]" />
              </button>

              {/* PREVIEW CUSTOMIZER POPUP CARD */}
              {showCustomizer && (
                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-80 max-w-sm sm:max-w-none max-h-[80vh] sm:max-h-[520px] overflow-y-auto p-5 bg-[#F6F4E5] text-[#282C1B] rounded-3xl shadow-2xl border border-[#4E562F]/20 z-50 animate-fade-in no-scrollbar mx-auto sm:mx-0">
                  {/* Header: Title + Art On / Off */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#4E562F]" />
                      <span className="text-xs font-black tracking-wider uppercase text-[#282C1B]">
                        PREVIEW CUSTOMIZER
                      </span>
                    </div>

                    <button
                      onClick={() => updateHeroCustomizer({ artOn: !heroCustomizer.artOn })}
                      className={`px-3 py-1 rounded-full text-xs font-black transition ${
                        heroCustomizer.artOn
                          ? 'bg-[#282C1B] text-[#FAF8F2]'
                          : 'bg-[#EAE5D8] text-[#6A7056]'
                      }`}
                    >
                      {heroCustomizer.artOn ? 'ART ON' : 'ART OFF'}
                    </button>
                  </div>

                  {/* Backdrop Opacity Range */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#6A7056]">
                      <span>Backdrop Opacity:</span>
                      <span className="text-[#4E562F] font-mono font-bold">
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
                      className="w-full h-2 bg-[#E2DEC8] rounded-lg appearance-none cursor-pointer accent-[#4E562F] disabled:opacity-30"
                    />
                  </div>

                  <div className="border-t border-[#4E562F]/15 my-4" />

                  {/* TOGGLE HERO ELEMENTS LIST */}
                  <div className="text-[11px] font-black text-[#6A7056] tracking-wider uppercase mb-3">
                    TOGGLE HERO ELEMENTS:
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* 1. Title Background Card */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">Title Background Card</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showTitleBackgroundCard: !heroCustomizer.showTitleBackgroundCard })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showTitleBackgroundCard
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showTitleBackgroundCard ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 2. Tagline Quote */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">Tagline Quote</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showTaglineQuote: !heroCustomizer.showTaglineQuote })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showTaglineQuote
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showTaglineQuote ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 3. Genre Pills in Hero */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">Genre Pills in Hero</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showGenrePills: !heroCustomizer.showGenrePills })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showGenrePills
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showGenrePills ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 4. % Match Score */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">% Match Score</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showMatchScore: !heroCustomizer.showMatchScore })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showMatchScore
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showMatchScore ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 5. ★ Rating Badge */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">★ Rating Badge</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showRatingBadge: !heroCustomizer.showRatingBadge })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showRatingBadge
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showRatingBadge ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 6. HD Quality Badge */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">HD Quality Badge</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showHDQualityBadge: !heroCustomizer.showHDQualityBadge })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showHDQualityBadge
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showHDQualityBadge ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 7. Watch Trailer Button */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">Watch Trailer Button</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showWatchTrailerButton: !heroCustomizer.showWatchTrailerButton })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showWatchTrailerButton
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showWatchTrailerButton ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 8. Synopsis in Hero */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">Synopsis in Hero</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showSynopsisInHero: !heroCustomizer.showSynopsisInHero })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showSynopsisInHero
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
                        }`}
                      >
                        {heroCustomizer.showSynopsisInHero ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* 9. Streaming Providers */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#282C1B]">Streaming Providers</span>
                      <button
                        onClick={() => updateHeroCustomizer({ showStreamingProviders: !heroCustomizer.showStreamingProviders })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          heroCustomizer.showStreamingProviders
                            ? 'bg-[#282C1B] text-[#FAF8F2]'
                            : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFECE1] sm:bg-black/50 hover:bg-[#E5E1D3] sm:hover:bg-black/70 text-[#282C1B] sm:text-white flex items-center justify-center transition sm:backdrop-blur-md border border-[#4E562F]/10 sm:border-white/15 active:scale-95"
              title="Rearrange & Customize Cards Order"
            >
              <Pencil className="w-4 h-4 text-[#4E562F] sm:text-[#E4EAB8]" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFECE1] sm:bg-black/50 hover:bg-[#E5E1D3] sm:hover:bg-black/70 text-[#282C1B] sm:text-white flex items-center justify-center transition sm:backdrop-blur-md border border-[#4E562F]/10 sm:border-white/15 active:scale-95"
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
            <div className="w-32 sm:w-48 md:w-56 flex-none aspect-[2/3] rounded-2xl overflow-hidden bg-[#FAF8F2] sm:bg-[#24291B] shadow-sm sm:shadow-2xl border border-[#4E562F]/15 sm:border-white/25 select-none transition-transform duration-300 hover:scale-[1.02] relative self-start">
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
                  ? 'p-4 sm:p-6 rounded-3xl bg-[#F3EFE4] sm:bg-black/60 sm:backdrop-blur-md border border-[#4E562F]/10 sm:border-white/15 shadow-sm sm:shadow-xl'
                  : ''
              }`}
            >
              {/* Media Type & Metadata Line (Cleanly on top of title) */}
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#6A7056] sm:text-[#E4EAB8] uppercase tracking-wider mb-1">
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
                    <span>{seasonsCount > 3 ? `${seasonsCount} SEASONS` : `${seasonsCount} ${seasonsCount === 1 ? 'SEASON' : 'SEASONS'}`}</span>
                  </>
                ) : null}
              </div>

              {/* Primary Title (Bold, Left-Aligned) */}
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-[#282C1B] sm:text-[#FAF8F2] tracking-tight leading-[1.18] sm:leading-[1.12] text-left">
                {item.title}
              </h1>

              {/* Tagline Quote */}
              {heroCustomizer.showTaglineQuote && item.tagline && (
                <p className="mt-1 text-xs sm:text-sm text-[#6A7056] sm:text-white/85 italic line-clamp-2 text-left">
                  "{item.tagline}"
                </p>
              )}

              {/* Genre Pills */}
              {heroCustomizer.showGenrePills && (
                <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5">
                  {(item.genres && item.genres.length > 0 ? item.genres : ['Animation', 'Action', 'Fantasy']).map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-[#E4EAB8] text-[#3B421E] text-xs font-bold shadow-xs"
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F2] sm:bg-black/60 text-[#282C1B] sm:text-[#E4EAB8] text-xs font-bold border border-[#4E562F]/15 sm:border-white/20 shadow-2xs">
                    <Star className="w-3.5 h-3.5 fill-[#4E562F] sm:fill-[#E4EAB8] text-[#4E562F] sm:text-[#E4EAB8]" />
                    <span className="tabular-nums font-black">{item.tmdbRating > 0 ? item.tmdbRating.toFixed(1) : '8.8'} / 10</span>
                  </span>
                )}

                {/* Vote Count */}
                {item.voteCount > 0 ? (
                  <span className="text-xs text-[#6A7056] sm:text-white/70 font-medium tabular-nums">
                    ({item.voteCount.toLocaleString()} votes)
                  </span>
                ) : (
                  <span className="text-xs text-[#6A7056] sm:text-white/70 font-medium tabular-nums">
                    (2,230 votes)
                  </span>
                )}

                {/* % Match Score Badge (Optional) */}
                {heroCustomizer.showMatchScore && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E4EAB8] text-[#3B421E] text-xs font-extrabold shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>{Math.min(99, Math.max(82, Math.round((item.tmdbRating || 7.5) * 10 + 12)))}% Match</span>
                  </span>
                )}

                {/* HD Quality Badge (Optional) */}
                {heroCustomizer.showHDQualityBadge && (
                  <span className="px-2.5 py-1 rounded-full bg-[#EFECE1] sm:bg-black/60 text-[#282C1B] sm:text-white/90 text-[11px] font-bold border border-[#4E562F]/10 sm:border-white/20 uppercase tracking-wider">
                    4K Ultra HD
                  </span>
                )}

                {/* Watch Trailer Button in Rating Row */}
                {heroCustomizer.showWatchTrailerButton && item.trailerUrl && !isPlayingTrailer && (
                  <button
                    onClick={() => setIsPlayingTrailer(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition shadow-xs active:scale-95 ml-auto sm:ml-0"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                    <span>Trailer</span>
                  </button>
                )}
              </div>

              {/* Optional Synopsis in Hero */}
              {heroCustomizer.showSynopsisInHero && item.overview && (
                <p className="mt-3 text-xs sm:text-sm text-[#494E38] sm:text-white/85 line-clamp-2 max-w-2xl leading-relaxed text-left">
                  {item.overview}
                </p>
              )}

              {/* Optional Streaming Providers in Hero */}
              {heroCustomizer.showStreamingProviders && (
                <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
                  {cleanedProviders.slice(0, 3).map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F2] sm:bg-black/60 text-[#282C1B] sm:text-white text-[11px] font-bold border border-[#4E562F]/10 sm:border-white/20"
                    >
                      <StreamingBrandIcon name={p.name} className="w-3.5 h-3.5 rounded-sm" />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hero Action Buttons (2x2 Pill Grid on Mobile, Flex on Desktop) */}
              <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full">
                {/* 1. Add to Watchlist */}
                <button
                  onClick={() => onToggleWatchlist(item.id)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-bold transition shadow-xs active:scale-95 ${
                    inWatchlist
                      ? 'bg-[#4E562F] text-[#FAF8F2]'
                      : 'bg-[#EFECE1] hover:bg-[#E5E1D3] text-[#282C1B] border border-[#4E562F]/10'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''}`} />
                  <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
                </button>

                {/* 2. Mark Watched */}
                <button
                  onClick={() => onToggleWatched(item.id)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-bold transition shadow-xs active:scale-95 ${
                    isWatched
                      ? 'bg-[#E4EAB8] text-[#3B421E] border border-[#4E562F]/20'
                      : isWatching
                      ? 'bg-[#FAF8F2] text-[#4E562F] border-2 border-[#4E562F]'
                      : 'bg-[#EFECE1] hover:bg-[#E5E1D3] text-[#282C1B] border border-[#4E562F]/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isWatched ? 'Watched' : isWatching ? `Watching (${progressPercent}%)` : 'Mark Watched'}</span>
                </button>

                {/* 3. Favorite */}
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-bold transition shadow-xs active:scale-95 ${
                    isFavorite
                      ? 'bg-[#FEDB99] text-[#624B15] border border-[#624B15]/20 font-black'
                      : 'bg-[#EFECE1] hover:bg-[#E5E1D3] text-[#282C1B] border border-[#4E562F]/10'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-[#624B15]' : ''}`} />
                  <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
                </button>

                {/* 4. Add to List */}
                <div className="relative">
                  <button
                    onClick={() => setIsAddingToList(!isAddingToList)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#EFECE1] hover:bg-[#E5E1D3] text-[#282C1B] text-xs font-bold transition active:scale-95 shadow-xs border border-[#4E562F]/10"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add to List</span>
                  </button>

                  {isAddingToList && (
                    <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-56 p-2 rounded-2xl bg-[#F6F4E5] shadow-2xl border border-[#4E562F]/15 z-30 animate-fade-in text-left">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#6A7056] px-2 py-1">
                        Select Collection
                      </div>
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
                                ? 'text-[#6A7056] opacity-60'
                                : 'hover:bg-[#EFECE1] text-[#282C1B]'
                            }`}
                          >
                            <span className="truncate">{list.title}</span>
                            {alreadyIn && <Check className="w-3 h-3 text-[#4E562F]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Divider Line below Hero */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="border-t border-[#4E562F]/15 mt-2 mb-2" />
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
              <div key="journal" className="w-full p-6 sm:p-7 rounded-3xl bg-[#F3EFE4] border border-[#4E562F]/10 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#6A7056] mb-3">
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
                    <div className="flex items-center justify-between text-xs text-[#6A7056] mb-1.5">
                      <span className="font-black uppercase tracking-wider">PROGRESS</span>
                      <span className="font-bold text-[#282C1B] tabular-nums">
                        {progressPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progressPercent}
                      onChange={e => onSetProgress(item.id, Number(e.target.value))}
                      className="w-full h-2.5 bg-[#E2DEC8] rounded-lg appearance-none cursor-pointer accent-[#4E562F]"
                    />
                  </div>
                </div>

                {/* Personal Notes */}
                <div className="pt-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#6A7056] mb-2.5">
                    PERSONAL NOTES & REFLECTIONS
                  </label>
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                      onBlur={() => onSetNotes(item.id, notesDraft)}
                      placeholder="Record your thoughts, memorable scenes, or reflections..."
                      className="w-full px-4 py-3 rounded-2xl bg-[#FAF8F2] text-[#282C1B] placeholder-[#8C9277] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4E562F] border border-[#4E562F]/15"
                    />
                    <button
                      onClick={() => onSetNotes(item.id, notesDraft)}
                      className="px-5 py-3 rounded-2xl bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition shrink-0 shadow-xs"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // 2. TV SERIES EPISODES CHECKLIST (FULL WIDTH)
          if (section.id === 'episodes') {
            if (item.type !== 'tv') return null;
            return (
              <div key="episodes" className="w-full p-6 sm:p-7 rounded-3xl bg-[#FAF8F2] border border-[#4E562F]/15 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#282C1B] tracking-tight">
                    Episodes & Seasons
                  </h3>
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
                              ? 'bg-[#4E562F] text-[#FAF8F2]'
                              : 'bg-[#EAE5D8] text-[#6A7056] hover:text-[#282C1B]'
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
                        onClick={() => onToggleTVEpisode(item.id, selectedSeason, ep)}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium transition border active:scale-95 shadow-2xs ${
                          isDone
                            ? 'bg-[#E4EAB8] text-[#3B421E] border-[#4E562F]/25 font-bold'
                            : 'bg-[#EAE5D8] hover:bg-[#E2DEC8] text-[#282C1B] border-[#4E562F]/10'
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
              <div key="overview_merged" className="w-full p-6 sm:p-7 rounded-3xl bg-[#FAF8F2] border border-[#4E562F]/15 shadow-xs space-y-6">
                {/* Full Overview Paragraph */}
                <div>
                  <h3 className="text-lg font-bold text-[#282C1B] mb-3 tracking-tight">
                    Overview
                  </h3>
                  <p className="text-sm sm:text-base text-[#494E38] leading-relaxed whitespace-pre-line">
                    {item.overview || 'No synopsis available for this title.'}
                  </p>
                </div>

                {/* Merged Production Details */}
                <div className="pt-4 border-t border-[#4E562F]/15">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#6A7056] mb-3">
                    Production Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5 text-xs text-[#6A7056]">
                    {item.originalTitle && item.originalTitle !== item.title && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Original Title:</span>
                        <strong className="text-[#282C1B] truncate ml-2">{item.originalTitle}</strong>
                      </div>
                    )}
                    {item.releaseDate && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Release Date:</span>
                        <strong className="text-[#282C1B]">{item.releaseDate}</strong>
                      </div>
                    )}
                    {item.productionCompany && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Production:</span>
                        <strong className="text-[#282C1B] truncate ml-2">{item.productionCompany}</strong>
                      </div>
                    )}
                    {item.country && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Country:</span>
                        <strong className="text-[#282C1B]">{item.country}</strong>
                      </div>
                    )}
                    {item.budget && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Budget:</span>
                        <strong className="text-[#282C1B]">{item.budget}</strong>
                      </div>
                    )}
                    {item.boxOffice && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Box Office:</span>
                        <strong className="text-[#282C1B]">{item.boxOffice}</strong>
                      </div>
                    )}
                    {item.status && (
                      <div className="flex justify-between border-b border-[#4E562F]/10 pb-1.5">
                        <span>Status:</span>
                        <strong className="text-[#282C1B]">{item.status}</strong>
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
              <div key="where_to_watch" className="w-full p-6 sm:p-7 rounded-3xl bg-[#FAF8F2] border border-[#4E562F]/15 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#282C1B] tracking-tight">
                      Where to Watch
                    </h3>
                    <span className="text-[11px] font-semibold text-[#6A7056] bg-[#EAE5D8] px-2.5 py-1 rounded-full">
                      {cleanedProviders.length} Platform{cleanedProviders.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Clean structured grid of streaming platform tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {cleanedProviders.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#EAE5D8] hover:bg-[#E2DEC8] border border-[#4E562F]/10 transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StreamingBrandIcon name={p.name} className="w-6 h-6 rounded-lg shrink-0 shadow-xs" />
                          <span className="text-xs font-bold text-[#282C1B] truncate">
                            {p.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                            p.type === 'stream'
                              ? 'bg-[#4E562F] text-[#FAF8F2]'
                              : p.type === 'rent'
                              ? 'bg-[#FAF8F2] text-[#4E562F] border border-[#4E562F]/20'
                              : 'bg-[#E4EAB8] text-[#3B421E]'
                          }`}
                        >
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#4E562F]/10 flex items-center justify-between text-[11px] text-[#6A7056]">
                  <span>Availability verified via TMDB</span>
                  <span className="font-semibold text-[#4E562F]">4K / HD Support</span>
                </div>
              </div>
            );
          }

          // 6. TOP CAST & CREW CARD (INDEPENDENT)
          if (section.id === 'cast_crew') {
            return (
              <div key="cast_crew" className="w-full p-6 sm:p-7 rounded-3xl bg-[#FAF8F2] border border-[#4E562F]/15 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#282C1B] tracking-tight">
                      Top Cast & Crew
                    </h3>
                    <span className="text-[11px] font-semibold text-[#6A7056] bg-[#EAE5D8] px-2.5 py-1 rounded-full">
                      {item.cast?.length || 0} Actors recorded
                    </span>
                  </div>

                  {/* Cast Members Grid with Profile Avatars */}
                  {(item.cast && item.cast.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {item.cast.slice(0, 6).map((c, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#EAE5D8] border border-[#4E562F]/10 shadow-2xs hover:bg-[#E2DEC8] transition"
                        >
                          {/* Cast Member Profile Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#D8D3C3] shrink-0 border border-[#4E562F]/15 flex items-center justify-center">
                            {c.profileUrl ? (
                              <SafeImage
                                src={c.profileUrl}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-[#4E562F]/60" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#282C1B] truncate">{c.name}</div>
                            <div className="text-[11px] text-[#6A7056] truncate">{c.character}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#EAE5D8] text-xs text-[#6A7056]">
                      Featured narrative cast & production crew recorded in journal.
                    </div>
                  )}
                </div>

                {/* Production Crew Row with Profile Avatars */}
                {item.crew && item.crew.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#4E562F]/10 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#6A7056]">
                      Key Production Crew
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {item.crew.slice(0, 4).map((cr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-[#EAE5D8]/70 border border-[#4E562F]/5"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#D8D3C3] shrink-0 border border-[#4E562F]/10 flex items-center justify-center">
                            {cr.profileUrl ? (
                              <SafeImage
                                src={cr.profileUrl}
                                alt={cr.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-[#4E562F]/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-bold text-[#282C1B] truncate">{cr.name}</div>
                            <div className="text-[10px] font-semibold text-[#4E562F] truncate uppercase tracking-wider">{cr.job}</div>
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
          <div className="w-full max-w-lg bg-[#F6F4E5] rounded-3xl shadow-2xl border border-[#4E562F]/20 p-6 text-[#282C1B] animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-[#4E562F]/10">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#4E562F]" />
                <h2 className="text-base sm:text-lg font-bold text-[#282C1B]">
                  Rearrange Preview Cards
                </h2>
              </div>
              <button
                onClick={() => setShowRearrangeModal(false)}
                className="p-1.5 rounded-full hover:bg-[#EFECE1] text-[#6A7056] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6A7056] mt-3 mb-4">
              Reorder or toggle sections to personalize your movie and series preview window.
            </p>

            {/* Cards List */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {cardSections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    section.visible
                      ? 'bg-[#EAE5D8] border-[#4E562F]/20 text-[#282C1B]'
                      : 'bg-[#F3EFE4] border-[#4E562F]/10 text-[#8C9277] opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#282C1B] truncate flex items-center gap-2">
                      <span>{section.label}</span>
                    </div>
                    <p className="text-[11px] text-[#6A7056] truncate mt-0.5">
                      {section.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Up Button */}
                    <button
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, 'up')}
                      className="p-1.5 rounded-lg bg-[#FAF8F2] text-[#282C1B] hover:bg-[#EFECE1] disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down Button */}
                    <button
                      disabled={idx === cardSections.length - 1}
                      onClick={() => moveSection(idx, 'down')}
                      className="p-1.5 rounded-lg bg-[#FAF8F2] text-[#282C1B] hover:bg-[#EFECE1] disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleSectionVisibility(section.id)}
                      className={`p-1.5 rounded-lg transition shadow-2xs ${
                        section.visible
                          ? 'bg-[#4E562F] text-[#FAF8F2]'
                          : 'bg-[#FAF8F2] text-[#8C9277] hover:text-[#282C1B]'
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
            <div className="mt-6 pt-4 border-t border-[#4E562F]/10 flex items-center justify-between gap-3">
              <button
                onClick={resetSectionOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#6A7056] hover:text-[#282C1B] hover:bg-[#EFECE1] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <button
                onClick={() => setShowRearrangeModal(false)}
                className="px-5 py-2 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition active:scale-95 shadow-xs"
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
