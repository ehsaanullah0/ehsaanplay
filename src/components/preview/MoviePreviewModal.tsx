import React, { useState, useEffect, useRef } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
  RATING_TAGS,
  RatingTagId,
  resolveRatingTag,
  DEFAULT_APP_TWEAKS,
} from '../../types/movie';
import { KNOWN_TV_SHOWS_METADATA } from '../../data/curatedCatalog';
import { fetchDetailsWithFallback } from '../../services/metadataFallback';
import { loadUserSettings, saveUserSettings, saveMediaCache, loadMediaCache } from '../../services/storage';
import { areMediaItemsSame, findMediaItemByIdOrAlias, resolveStateForMediaItem } from '../../utils/mediaDedup';
import { SafeImage } from '../common/SafeImage';
import { MoviePoster } from '../common/MoviePoster';
import { PosterAmbientGlow } from './PosterAmbientGlow';
import { StarRating } from '../common/StarRating';
import { StreamingBrandIcon } from '../common/StreamingBrandIcon';
import { CastCrewDetailModal, SelectedPersonInfo } from '../common/CastCrewDetailModal';
import { openStreamingPlatform } from '../../services/streamingDirectUrls';
import { useRegisterBackAction } from '../../contexts/BackNavigationContext';
import {
  getCachedSimilarTitles,
  getSimilarTitlesForMedia,
  rankLocalSimilarTitles,
} from '../../services/similarTitles';
import { getImdbRatingPageUrl } from '../../utils/imdbUrl';
import {
  X,
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  Heart,
  Star,
  Play,
  Tv,
  Film,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
  Moon,
  ExternalLink,
} from 'lucide-react';

export type PreviewCardId =
  | 'journal'
  | 'notes'
  | 'progress'
  | 'episodes'
  | 'overview'
  | 'production'
  | 'where_to_watch'
  | 'cast_crew'
  | 'similar_titles';

export interface PreviewCardItem {
  id: PreviewCardId;
  label: string;
  description: string;
  visible: boolean;
}

const DEFAULT_CARD_SECTIONS: PreviewCardItem[] = [
  {
    id: 'journal',
    label: 'Personal Rating',
    description: 'Your Verdict rating tier selector',
    visible: true,
  },
  {
    id: 'notes',
    label: 'Personal Notes & Reflections',
    description: 'Private journal notes, quotes, and reflections',
    visible: true,
  },
  {
    id: 'progress',
    label: 'Movie Watch Progress',
    description: 'Independent watch progress bar for movies only',
    visible: true,
  },
  {
    id: 'episodes',
    label: 'Episodes & Seasons (TV)',
    description: 'Episode checklist and season tabs for TV series',
    visible: true,
  },
  {
    id: 'cast_crew',
    label: 'Top Cast & Crew',
    description: 'Featured actors and key production crew profiles',
    visible: true,
  },
  {
    id: 'overview',
    label: 'Story Overview',
    description: 'Plot synopsis and compact Watch Trailer action',
    visible: true,
  },
  {
    id: 'production',
    label: 'Title & Production Details',
    description: 'Most loved episode, length, release date, cast/crew & studio info',
    visible: true,
  },
  {
    id: 'where_to_watch',
    label: 'Where to Watch',
    description: 'Streaming providers, rent, and purchase availability',
    visible: true,
  },
  {
    id: 'similar_titles',
    label: 'Similar Titles',
    description: 'Recommended movies and series matching this title',
    visible: true,
  },
];

export interface HeroCustomizerConfig {
  artOn: boolean;
  opacity: number;
  desktopOpacity?: number;
  forceDarkMode: boolean;
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
  desktopOpacity: 0.95,
  forceDarkMode: false,
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
  colorScheme?: string;
  appTheme?: 'cream' | 'dark-olive' | 'oled-black';
  onHydrateDetails?: (item: MediaItem) => Promise<MediaItem | undefined>;
  onToggleWatchlist: (id: string, item?: MediaItem) => void;
  onToggleWatched: (id: string, item?: MediaItem) => void;
  onMarkWatched?: (id: string, item?: MediaItem) => void;
  onMarkWatching?: (id: string, item?: MediaItem) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  onToggleFavorite: (id: string, item?: MediaItem) => void;
  onSetRating: (id: string, rating: number | undefined, ratingTag?: RatingTagId, item?: MediaItem) => void;
  onSetNotes: (id: string, notes: string, item?: MediaItem) => void;
  onSetProgress: (id: string, progress: number, item?: MediaItem) => void;
  onToggleTVEpisode: (id: string, season: number, episode: number, item?: MediaItem) => void;
  onToggleSeasonEpisodes?: (id: string, season: number, episodeNumbers: number[], forceMarkDone: boolean, item?: MediaItem) => void;
  onAddItemToList: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList?: (listId: string, mediaId: string) => void;
  onOpenImdbPreview?: (imdbIdOrUrl: string) => void;
  mediaItems?: MediaItem[];
  userStates?: Record<string, PersonalMediaState>;
  onSelectMedia?: (item: MediaItem) => void;
  onRegisterBackHandler?: (handler: (() => boolean) | null) => void;
  posterGlowEnabled?: boolean;
  onTogglePosterGlow?: (enabled: boolean) => void;
  posterGlowContrast?: number;
  onChangePosterGlowContrast?: (contrast: number) => void;
  showPosterCard?: boolean;
  onToggleShowPosterCard?: (show: boolean) => void;
}

export interface PreviewHistoryEntry {
  item: MediaItem;
  person: SelectedPersonInfo | null;
}

export const MoviePreviewModal: React.FC<MoviePreviewModalProps> = ({
  item: initialItem,
  isOpen,
  onClose,
  userState,
  customLists,
  backdropOpacity: defaultOpacity,
  colorScheme,
  appTheme,
  onHydrateDetails,
  onToggleWatchlist,
  onToggleWatched,
  onMarkWatched,
  onMarkWatching,
  onRemoveFromWatchlist,
  onDismissFromWatching,
  onAddMediaToLibrary,
  onToggleFavorite,
  onSetRating,
  onSetNotes,
  onSetProgress,
  onToggleTVEpisode,
  onToggleSeasonEpisodes,
  onAddItemToList,
  onRemoveItemFromList,
  onOpenImdbPreview: _onOpenImdbPreview,
  mediaItems = [],
  userStates = {},
  onSelectMedia,
  onRegisterBackHandler,
  posterGlowEnabled,
  onTogglePosterGlow,
  posterGlowContrast,
  onChangePosterGlowContrast,
  showPosterCard,
  onToggleShowPosterCard,
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
  const [reloadingType, setReloadingType] = useState<'poster' | 'banner' | 'all' | null>(null);
  const [reloadFeedback, setReloadFeedback] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPersonInfo | null>(null);
  const [showAllCast, setShowAllCast] = useState(false);
  const [isTitleCopied, setIsTitleCopied] = useState(false);
  const titleCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [similarTitles, setSimilarTitles] = useState<MediaItem[]>([]);

  useEffect(() => {
    setIsTitleCopied(false);
    if (titleCopyTimerRef.current) {
      clearTimeout(titleCopyTimerRef.current);
      titleCopyTimerRef.current = null;
    }
    return () => {
      if (titleCopyTimerRef.current) {
        clearTimeout(titleCopyTimerRef.current);
        titleCopyTimerRef.current = null;
      }
    };
  }, [item?.id]);

  const handleCopyTitle = async (titleToCopy: string) => {
    if (!titleToCopy) return;
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(titleToCopy);
        copied = true;
      }
    } catch {
      // Fallback below
    }
    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = titleToCopy;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // ignore
      }
    }
    if (copied) {
      setIsTitleCopied(true);
      if (titleCopyTimerRef.current) clearTimeout(titleCopyTimerRef.current);
      titleCopyTimerRef.current = setTimeout(() => setIsTitleCopied(false), 1800);
    }
  };
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [similarCanScrollLeft, setSimilarCanScrollLeft] = useState(false);
  const [similarCanScrollRight, setSimilarCanScrollRight] = useState(false);
  const similarRailRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  const desktopListContainerRef = useRef<HTMLDivElement>(null);
  const mobileListContainerRef = useRef<HTMLDivElement>(null);
  const mediaItemsRef = useRef<MediaItem[]>(mediaItems);
  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);
  const lastOpenedItemIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const reloadFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const similarScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const similarScrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
      if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
      if (similarScrollTimerRef.current) clearTimeout(similarScrollTimerRef.current);
      if (similarScrollRafRef.current !== null) cancelAnimationFrame(similarScrollRafRef.current);
    };
  }, []);

  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktopViewport(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // Navigation History Stack (supports returning back to Actor Profile when credit is opened)
  const [previewHistory, setPreviewHistory] = useState<PreviewHistoryEntry[]>([]);
  const previewHistoryRef = useRef<PreviewHistoryEntry[]>([]);
  useEffect(() => {
    previewHistoryRef.current = previewHistory;
  }, [previewHistory]);

  const selectedPersonRef = useRef<SelectedPersonInfo | null>(null);
  useEffect(() => {
    selectedPersonRef.current = selectedPerson;
  }, [selectedPerson]);

  const showCustomizerRef = useRef(showCustomizer);
  useEffect(() => { showCustomizerRef.current = showCustomizer; }, [showCustomizer]);
  const showRearrangeModalRef = useRef(showRearrangeModal);
  useEffect(() => { showRearrangeModalRef.current = showRearrangeModal; }, [showRearrangeModal]);
  const isAddingToListRef = useRef(isAddingToList);
  useEffect(() => { isAddingToListRef.current = isAddingToList; }, [isAddingToList]);

  // Dismiss open popups (Preview Customizer / Add to Collection) on outside pointer click
  useEffect(() => {
    if (!showCustomizer && !isAddingToList) return;

    const handleOutsidePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (showCustomizer && customizerContainerRef.current && !customizerContainerRef.current.contains(target)) {
        setShowCustomizer(false);
      }
      if (isAddingToList) {
        const insideDesktop = desktopListContainerRef.current?.contains(target);
        const insideMobile = mobileListContainerRef.current?.contains(target);
        if (!insideDesktop && !insideMobile) {
          setIsAddingToList(false);
        }
      }
    };

    window.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => window.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [showCustomizer, isAddingToList]);

  // Handle opening a credit from an actor's filmography without destroying the actor profile
  const handleSelectCreditFromActorProfile = (newMedia: MediaItem) => {
    if (item && selectedPerson) {
      setPreviewHistory((prev) => [
        ...prev,
        { item, person: selectedPerson },
      ]);
    }
    setSelectedPerson(null);
    setShowCustomizer(false);
    setIsAddingToList(false);
    setShowRearrangeModal(false);
    setIsPlayingTrailer(false);
    setIsOverviewExpanded(false);
    setSelectedSeason(1);
    setShowAllCast(false);
    setReloadFeedback(null);
    setItem(newMedia);
    const nextState = resolveStateForMediaItem(newMedia, userStates, mediaItemsRef.current);
    setNotesDraft(nextState?.notes || '');
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
    if (onSelectMedia) {
      onSelectMedia(newMedia);
    }
  };

  // Handle going back in history (returns to actor profile if opened from one)
  const handleBackClick = () => {
    const history = previewHistoryRef.current;
    if (history.length > 0) {
      const prevEntry = history[history.length - 1];
      setPreviewHistory((prev) => prev.slice(0, -1));
      setShowCustomizer(false);
      setIsAddingToList(false);
      setShowRearrangeModal(false);
      setIsPlayingTrailer(false);
      setReloadFeedback(null);
      setItem(prevEntry.item);
      setSelectedPerson(prevEntry.person);
      const prevState = resolveStateForMediaItem(prevEntry.item, userStates, mediaItemsRef.current);
      setNotesDraft(prevState?.notes || '');
      if (onSelectMedia) {
        onSelectMedia(prevEntry.item);
      }
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }
      return;
    }
    onClose();
  };

  const handleBackClickRef = useRef(handleBackClick);
  handleBackClickRef.current = handleBackClick;

  // Register back navigation handler with parent App (for Android back gesture and shortcuts)
  useEffect(() => {
    if (onRegisterBackHandler) {
      onRegisterBackHandler(() => {
        if (showCustomizerRef.current) {
          setShowCustomizer(false);
          return true;
        }
        if (showRearrangeModalRef.current) {
          setShowRearrangeModal(false);
          return true;
        }
        if (isAddingToListRef.current) {
          setIsAddingToList(false);
          return true;
        }
        if (selectedPersonRef.current) {
          setSelectedPerson(null);
          return true;
        }
        if (previewHistoryRef.current.length > 0) {
          handleBackClickRef.current();
          return true;
        }
        return false;
      });
    }
    return () => {
      if (onRegisterBackHandler) {
        onRegisterBackHandler(null);
      }
    };
  }, [onRegisterBackHandler]);

  useRegisterBackAction(
    isOpen && item !== null,
    () => {
      if (showCustomizerRef.current) {
        setShowCustomizer(false);
        return;
      }
      if (showRearrangeModalRef.current) {
        setShowRearrangeModal(false);
        return;
      }
      if (isAddingToListRef.current) {
        setIsAddingToList(false);
        return;
      }
      if (selectedPersonRef.current) {
        setSelectedPerson(null);
        return;
      }
      if (previewHistoryRef.current.length > 0) {
        handleBackClickRef.current();
        return;
      }
      onClose();
    },
    50
  );

  // Local Escape key interceptor (stops propagation when sub-views or history are active)
  useEffect(() => {
    if (!isOpen) return;

    const handleLocalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCustomizer) {
          e.preventDefault();
          e.stopPropagation();
          setShowCustomizer(false);
          return;
        }
        if (showRearrangeModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowRearrangeModal(false);
          return;
        }
        if (isAddingToList) {
          e.preventDefault();
          e.stopPropagation();
          setIsAddingToList(false);
          return;
        }
        if (selectedPerson) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedPerson(null);
          return;
        }
        if (previewHistory.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleBackClick();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleLocalKeyDown, true);
    return () => window.removeEventListener('keydown', handleLocalKeyDown, true);
  }, [isOpen, showCustomizer, showRearrangeModal, isAddingToList, selectedPerson, previewHistory]);

  // Reset navigation history whenever modal is fully closed
  useEffect(() => {
    if (!isOpen) {
      setPreviewHistory([]);
      setSelectedPerson(null);
    }
  }, [isOpen]);

  const handleReloadSingleArtwork = async (target: 'poster' | 'banner' | 'all') => {
    if (!item || reloadingType !== null) return;
    setReloadingType(target);
    setReloadFeedback(null);

    try {
      const settings = loadUserSettings();
      const { details } = await fetchDetailsWithFallback(
        item,
        settings.tmdbApiKey,
        settings.omdbApiKey
      );

      let updatedPoster = item.posterUrl;
      let updatedFallbackPoster = item.fallbackPosterUrl;
      let updatedBackdrop = item.backdropUrl;

      if (target === 'poster' || target === 'all') {
        if (details.posterUrl) {
          updatedPoster = details.posterUrl;
          updatedFallbackPoster = details.posterUrl;
        }
      }

      if (target === 'banner' || target === 'all') {
        if (details.backdropUrl) {
          updatedBackdrop = details.backdropUrl;
        } else if (details.posterUrl && !updatedBackdrop) {
          updatedBackdrop = details.posterUrl;
        }
      }

      const updatedItem: MediaItem = {
        ...item,
        ...details,
        posterUrl: updatedPoster || item.posterUrl,
        fallbackPosterUrl: updatedFallbackPoster || item.fallbackPosterUrl || item.posterUrl,
        backdropUrl: updatedBackdrop || item.backdropUrl || item.posterUrl,
      };

      setItem(updatedItem);

      // Save to local storage media cache
      const cache = loadMediaCache();
      const updatedCache = cache.map(m => (m.id === item.id ? updatedItem : m));
      if (!updatedCache.some(m => m.id === item.id)) {
        updatedCache.push(updatedItem);
      }
      saveMediaCache(updatedCache);

      if (onHydrateDetails) {
        onHydrateDetails(updatedItem);
      }

      const msg =
        target === 'poster'
          ? 'Poster reloaded'
          : target === 'banner'
          ? 'Banner reloaded'
          : 'Poster & Banner reloaded';
      setReloadFeedback(msg);
      if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
      reloadFeedbackTimerRef.current = setTimeout(() => {
        setReloadFeedback(null);
      }, 3500);
    } catch (err) {
      console.warn('Failed to reload artwork for title:', err);
      setReloadFeedback('Reload failed');
      if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
      reloadFeedbackTimerRef.current = setTimeout(() => {
        setReloadFeedback(null);
      }, 3000);
    } finally {
      setReloadingType(null);
    }
  };

  // Load customizable hero options (background artwork defaults to off on mobile/tablet, on on desktop)
  const [heroCustomizer, setHeroCustomizer] = useState<HeroCustomizerConfig>(() => {
    const isMobileOrTablet = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
    const defaultArtOn = !isMobileOrTablet;
    try {
      const saved = localStorage.getItem(HERO_CUSTOMIZER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_HERO_CUSTOMIZER,
          artOn: parsed.artOn !== undefined ? parsed.artOn : defaultArtOn,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_HERO_CUSTOMIZER, artOn: defaultArtOn };
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

  // Poster ambient color glow, contrast, and poster card visibility (synced with UserSettings.tweaks)
  const [localPosterGlow, setLocalPosterGlow] = useState<boolean>(() => {
    if (typeof posterGlowEnabled === 'boolean') return posterGlowEnabled;
    return loadUserSettings().tweaks?.previewPosterGlow !== false;
  });
  const [localPosterGlowContrast, setLocalPosterGlowContrast] = useState<number>(() => {
    if (typeof posterGlowContrast === 'number') return posterGlowContrast;
    return loadUserSettings().tweaks?.previewPosterGlowContrast ?? 1.0;
  });
  const [localShowPosterCard, setLocalShowPosterCard] = useState<boolean>(() => {
    if (typeof showPosterCard === 'boolean') return showPosterCard;
    const tweaks = loadUserSettings().tweaks;
    return isDesktopViewport
      ? tweaks?.previewShowPosterCardDesktop === true
      : tweaks?.previewShowPosterCard !== false;
  });

  useEffect(() => {
    if (typeof posterGlowEnabled === 'boolean') {
      setLocalPosterGlow(posterGlowEnabled);
    }
  }, [posterGlowEnabled]);

  useEffect(() => {
    if (typeof posterGlowContrast === 'number') {
      setLocalPosterGlowContrast(posterGlowContrast);
    }
  }, [posterGlowContrast]);

  useEffect(() => {
    if (typeof showPosterCard === 'boolean') {
      setLocalShowPosterCard(showPosterCard);
    }
  }, [showPosterCard]);

  useEffect(() => {
    const syncFromSettings = () => {
      const settings = loadUserSettings();
      setLocalPosterGlow(settings.tweaks?.previewPosterGlow !== false);
      setLocalPosterGlowContrast(settings.tweaks?.previewPosterGlowContrast ?? 1.0);
      setLocalShowPosterCard(
        isDesktopViewport
          ? settings.tweaks?.previewShowPosterCardDesktop === true
          : settings.tweaks?.previewShowPosterCard !== false
      );
    };
    syncFromSettings();
    window.addEventListener('ehsaan:settings-change', syncFromSettings);
    return () => window.removeEventListener('ehsaan:settings-change', syncFromSettings);
  }, [isDesktopViewport]);

  const isPosterGlowEnabled = typeof posterGlowEnabled === 'boolean' ? posterGlowEnabled : localPosterGlow;
  const effectivePosterGlowContrast =
    typeof posterGlowContrast === 'number' ? posterGlowContrast : localPosterGlowContrast;
  const isPosterCardVisible = typeof showPosterCard === 'boolean' ? showPosterCard : localShowPosterCard;

  const effectiveArtOpacity = isDesktopViewport
    ? (heroCustomizer.desktopOpacity ?? 0.95)
    : heroCustomizer.opacity;

  const handleToggleShowPosterCard = () => {
    const nextShow = !isPosterCardVisible;
    setLocalShowPosterCard(nextShow);
    if (onToggleShowPosterCard) {
      onToggleShowPosterCard(nextShow);
    } else {
      const current = loadUserSettings();
      saveUserSettings({
        ...current,
        tweaks: {
          ...DEFAULT_APP_TWEAKS,
          ...current.tweaks,
          ...(isDesktopViewport
            ? { previewShowPosterCardDesktop: nextShow }
            : { previewShowPosterCard: nextShow }),
        },
      });
    }
  };

  const handleTogglePosterGlow = () => {
    const nextEnabled = !isPosterGlowEnabled;
    setLocalPosterGlow(nextEnabled);
    if (onTogglePosterGlow) {
      onTogglePosterGlow(nextEnabled);
    } else {
      const current = loadUserSettings();
      saveUserSettings({
        ...current,
        tweaks: {
          ...DEFAULT_APP_TWEAKS,
          ...current.tweaks,
          previewPosterGlow: nextEnabled,
        },
      });
    }
  };

  const handleChangePosterGlowContrast = (nextContrast: number) => {
    const clamped = Math.max(0.25, Math.min(2.0, Math.round(nextContrast * 20) / 20));
    setLocalPosterGlowContrast(clamped);
    if (onChangePosterGlowContrast) {
      onChangePosterGlowContrast(clamped);
    } else {
      const current = loadUserSettings();
      saveUserSettings({
        ...current,
        tweaks: {
          ...DEFAULT_APP_TWEAKS,
          ...current.tweaks,
          previewPosterGlowContrast: clamped,
        },
      });
    }
  };

  // Load customizable card section order (with seamless migration when new sections are added)
  const [cardSections, setCardSections] = useState<PreviewCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(PREVIEW_SECTIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultMap = new Map(DEFAULT_CARD_SECTIONS.map(s => [s.id, s]));
          const merged: PreviewCardItem[] = [];
          const seen = new Set<PreviewCardId>();

          for (const raw of parsed) {
            if (raw && typeof raw.id === 'string' && defaultMap.has(raw.id as PreviewCardId) && !seen.has(raw.id as PreviewCardId)) {
              const def = defaultMap.get(raw.id as PreviewCardId)!;
              merged.push({
                ...def,
                visible: typeof raw.visible === 'boolean' ? raw.visible : def.visible,
              });
              seen.add(def.id);
            }
          }

          // Insert any newly introduced default sections in their natural slot
          for (const def of DEFAULT_CARD_SECTIONS) {
            if (!seen.has(def.id)) {
              if (def.id === 'notes') {
                const journalIdx = merged.findIndex(s => s.id === 'journal');
                const inheritedVisible = journalIdx >= 0 ? merged[journalIdx].visible : def.visible;
                const notesEntry = { ...def, visible: inheritedVisible };
                if (journalIdx >= 0) {
                  merged.splice(journalIdx + 1, 0, notesEntry);
                } else {
                  merged.unshift(notesEntry);
                }
              } else if (def.id === 'progress') {
                const anchorIdx = merged.findIndex(s => s.id === 'notes');
                const fallbackIdx = merged.findIndex(s => s.id === 'journal');
                const insertAfter = anchorIdx >= 0 ? anchorIdx : fallbackIdx;
                if (insertAfter >= 0) {
                  merged.splice(insertAfter + 1, 0, def);
                } else {
                  merged.unshift(def);
                }
              } else {
                merged.push(def);
              }
              seen.add(def.id);
            }
          }

          if (merged.length === DEFAULT_CARD_SECTIONS.length) {
            return merged;
          }
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

  // Sync item, screen-size default artOn, and trigger real-time rich details hydration
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      lastOpenedItemIdRef.current = null;
      setIsAddingToList(false);
      setShowCustomizer(false);
      setShowRearrangeModal(false);
      setIsPlayingTrailer(false);
      return;
    }

    const isOpeningFresh = !wasOpenRef.current || initialItem?.id !== lastOpenedItemIdRef.current;
    wasOpenRef.current = true;
    lastOpenedItemIdRef.current = initialItem?.id || null;

    if (isOpeningFresh) {
      setItem(initialItem);
      const resolvedInitialState = initialItem
        ? resolveStateForMediaItem(initialItem, userStates, mediaItems) || userState
        : userState;
      setNotesDraft(resolvedInitialState?.notes || '');
      setIsPlayingTrailer(false);
      setIsOverviewExpanded(false);
      setSelectedSeason(1);
      setShowAllCast(false);
      setIsAddingToList(false);
      setShowCustomizer(false);
      setShowRearrangeModal(false);

      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }

      const isMobileOrTablet = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
      try {
        const saved = localStorage.getItem(HERO_CUSTOMIZER_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.artOn === undefined) {
            setHeroCustomizer(prev => ({ ...prev, artOn: !isMobileOrTablet }));
          }
        } else {
          setHeroCustomizer(prev => ({ ...prev, artOn: !isMobileOrTablet }));
        }
      } catch {
        setHeroCustomizer(prev => ({ ...prev, artOn: !isMobileOrTablet }));
      }
    } else if (initialItem) {
      setItem(prev => {
        if (!prev || prev.id !== initialItem.id) return initialItem;
        return {
          ...prev,
          ...initialItem,
          cast: initialItem.cast?.length ? initialItem.cast : prev.cast,
          crew: initialItem.crew?.length ? initialItem.crew : prev.crew,
          providers: initialItem.providers?.length ? initialItem.providers : prev.providers,
          seasons: initialItem.seasons?.length ? initialItem.seasons : prev.seasons,
        };
      });
    }

    let isCancelled = false;
    if (initialItem && onHydrateDetails) {
      if (!initialItem.cast?.length || !initialItem.providers?.length || initialItem.type === 'tv') {
        onHydrateDetails(initialItem).then(enriched => {
          if (!isCancelled && enriched) {
            setItem(enriched);
          }
        });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [initialItem, isOpen, onHydrateDetails]);

  // Load taste-matched Similar Titles whenever preview item opens/changes
  useEffect(() => {
    if (!isOpen || !item) {
      return;
    }

    let cancelled = false;
    const cached = getCachedSimilarTitles(item);
    if (cached && cached.length > 0) {
      setSimilarTitles(cached);
      setIsLoadingSimilar(false);
      return;
    }

    const currentPool = mediaItemsRef.current;
    const instantLocal = rankLocalSimilarTitles(item, currentPool, 16);
    setSimilarTitles(instantLocal);
    setIsLoadingSimilar(true);

    const apiKey = loadUserSettings().tmdbApiKey;
    getSimilarTitlesForMedia(item, currentPool, apiKey, 16)
      .then((results) => {
        if (cancelled) return;
        if (results.length > 0) {
          setSimilarTitles(results);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSimilar(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, item?.id, item?.tmdbId, item?.imdbId]);

  const updateSimilarScrollButtons = () => {
    if (similarScrollRafRef.current !== null) return;
    similarScrollRafRef.current = requestAnimationFrame(() => {
      similarScrollRafRef.current = null;
      const el = similarRailRef.current;
      if (!el) return;
      const nextLeft = el.scrollLeft > 12;
      const nextRight =
        el.scrollWidth > el.clientWidth + 12 && el.scrollLeft + el.clientWidth < el.scrollWidth - 12;
      setSimilarCanScrollLeft(prev => (prev === nextLeft ? prev : nextLeft));
      setSimilarCanScrollRight(prev => (prev === nextRight ? prev : nextRight));
    });
  };

  const isSimilarSectionVisible = cardSections.some(s => s.id === 'similar_titles' && s.visible);

  useEffect(() => {
    if (!isSimilarSectionVisible) return;
    const el = similarRailRef.current;
    const t1 = setTimeout(updateSimilarScrollButtons, 80);
    const t2 = setTimeout(updateSimilarScrollButtons, 320);
    window.addEventListener('resize', updateSimilarScrollButtons);

    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSimilarScrollButtons);
      observer.observe(el);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', updateSimilarScrollButtons);
      observer?.disconnect();
    };
  }, [similarTitles, isOpen, isSimilarSectionVisible]);

  const handleScrollSimilarRail = (direction: 'left' | 'right') => {
    const el = similarRailRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.78;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
    if (similarScrollTimerRef.current) clearTimeout(similarScrollTimerRef.current);
    similarScrollTimerRef.current = setTimeout(updateSimilarScrollButtons, 340);
  };

  const handleSelectSimilarTitle = (similarItem: MediaItem) => {
    if (!item) return;
    setPreviewHistory((prev) => [...prev, { item, person: null }]);
    setSelectedPerson(null);
    setShowCustomizer(false);
    setIsAddingToList(false);
    setShowRearrangeModal(false);
    setIsPlayingTrailer(false);
    setIsOverviewExpanded(false);
    setSelectedSeason(1);
    setShowAllCast(false);
    setReloadFeedback(null);
    setItem(similarItem);
    const nextState = resolveStateForMediaItem(similarItem, userStates, mediaItemsRef.current);
    setNotesDraft(nextState?.notes || '');
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
    if (onSelectMedia) {
      onSelectMedia(similarItem);
    }
  };

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

  // Dynamically resolve active user state across alias keys using timestamp priority
  const activeUserState = React.useMemo(() => {
    if (!item) return userState;
    return resolveStateForMediaItem(item, userStates, mediaItems) || userState;
  }, [item, userStates, mediaItems, userState]);

  if (!isOpen || !item) return null;

  const isWatched = !!activeUserState?.isWatched;
  const inWatchlist = !!activeUserState?.inWatchlist;
  const isFavorite = !!activeUserState?.isFavorite;
  const progressPercent = activeUserState?.progressPercent || 0;
  const isWatching = !isWatched && progressPercent > 0;
  const personalRating = activeUserState?.personalRating || 0;

  // Helper for alias-aware list membership (O(1) via WeakMap media index)
  const isItemInCustomList = (list: CustomList) =>
    list.itemIds.some(id => {
      if (id === item.id || (item.imdbId && id === item.imdbId)) return true;
      if (item.tmdbId && id === `tmdb-${item.type || 'movie'}-${item.tmdbId}`) return true;
      const existing = findMediaItemByIdOrAlias(id, mediaItems);
      return Boolean(existing && areMediaItemsSame(existing, item));
    });

  // TV Episode and season calculations (Prioritizes accurate known metadata over outdated cache)
  const knownMeta = item.type === 'tv' && item.id ? KNOWN_TV_SHOWS_METADATA[item.id] : undefined;
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
  const effectiveSeason = item.type === 'tv' ? Math.min(selectedSeason, seasonsCount || 1) : 1;
  const totalEpisodesCount = item.type === 'tv'
    ? Math.max(
        item.episodesCount || 0,
        knownMeta?.episodesCount || 0,
        seasonsList.reduce((acc, s) => acc + (s.episodeCount || 0), 0),
        (seasonsCount || 1) * 8
      )
    : undefined;
  const currentSeasonInfo = seasonsList.find(s => s.seasonNumber === effectiveSeason);
  const episodesPerSeason = Math.max(
    1,
    currentSeasonInfo?.episodeCount ||
      (seasonsCount && totalEpisodesCount ? Math.ceil(totalEpisodesCount / seasonsCount) : 8) ||
      8
  );

  // Format total duration in hours and minutes (e.g. "2h 28m" or "46h 30m")
  const formatHoursMinutes = (mins: number): string => {
    const rounded = Math.max(0, Math.round(mins));
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Format release date nicely (e.g. "Jul 16, 2010")
  const formattedReleaseDate = (() => {
    if (item.releaseDate) {
      const parsed = new Date(`${item.releaseDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(item.releaseDate)) {
        return parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return item.releaseDate;
    }
    return item.year ? String(item.year) : undefined;
  })();

  // Aggregate unique episode details across item.episodesList & seasons[].episodes
  const allEpisodeDetails = (() => {
    if (item.type !== 'tv') return [];
    const seen = new Map<string, NonNullable<MediaItem['episodesList']>[number]>();
    const addEps = (eps?: MediaItem['episodesList']) => {
      if (!Array.isArray(eps)) return;
      for (const ep of eps) {
        if (!ep) continue;
        const key = `s${ep.seasonNumber}e${ep.episodeNumber}`;
        const prev = seen.get(key);
        if (!prev || ((ep.rating || 0) > (prev.rating || 0))) {
          seen.set(key, ep);
        }
      }
    };
    addEps(item.episodesList);
    for (const s of seasonsList) {
      addEps(s.episodes);
    }
    return Array.from(seen.values());
  })();

  // Most loved episode (highest rated episode for TV series, when available)
  const mostLovedEpisode = (() => {
    if (item.type !== 'tv' || allEpisodeDetails.length === 0) return null;
    let best = null as (typeof allEpisodeDetails)[number] | null;
    for (const ep of allEpisodeDetails) {
      if (typeof ep.rating === 'number' && ep.rating > 0) {
        if (!best || ep.rating > (best.rating || 0)) {
          best = ep;
        }
      }
    }
    return best;
  })();

  // Total duration label in hours & minutes for both movies and TV series
  const totalLengthLabel = (() => {
    if (item.type === 'movie') {
      return item.runtime && item.runtime > 0 ? formatHoursMinutes(item.runtime) : undefined;
    }
    // TV series total runtime calculation
    const timedEpisodes = allEpisodeDetails.filter(ep => typeof ep.runtime === 'number' && ep.runtime > 0);
    const epCount = totalEpisodesCount || allEpisodeDetails.length || 0;
    if (timedEpisodes.length > 0 && epCount > 0 && timedEpisodes.length >= epCount) {
      const exactTotal = timedEpisodes.reduce((sum, ep) => sum + (ep.runtime || 0), 0);
      return `${formatHoursMinutes(exactTotal)} (${epCount} eps)`;
    }
    const avgRuntime = timedEpisodes.length > 0
      ? Math.round(timedEpisodes.reduce((sum, ep) => sum + (ep.runtime || 0), 0) / timedEpisodes.length)
      : (item.runtime && item.runtime > 0 ? item.runtime : 45);
    if (epCount > 0 && avgRuntime > 0) {
      return `~${formatHoursMinutes(epCount * avgRuntime)} (${epCount} eps · ~${avgRuntime}m/ep)`;
    }
    return undefined;
  })();

  // Key crew (Director / Creator / Showrunner / Writers) and top cast summary
  const topCrewSummary = (() => {
    if (!item.crew || item.crew.length === 0) return null;
    const priorityRoles = ['Creator', 'Director', 'Showrunner', 'Writer', 'Screenplay'];
    const preferred = item.crew.filter(c => priorityRoles.includes(c.job));
    const chosen = (preferred.length > 0 ? preferred : item.crew).slice(0, 3);
    const uniqueNames = Array.from(new Set(chosen.map(c => c.name).filter(Boolean)));
    if (uniqueNames.length === 0) return null;
    const primaryRole = preferred[0]?.job || chosen[0]?.job || 'Crew';
    const label = primaryRole === 'Creator'
      ? (uniqueNames.length > 1 ? 'Creators' : 'Creator')
      : primaryRole === 'Director'
      ? (uniqueNames.length > 1 ? 'Directors' : 'Director')
      : 'Top Crew';
    return { label, value: uniqueNames.join(', ') };
  })();

  const topActorsSummary = (() => {
    if (!item.cast || item.cast.length === 0) return undefined;
    const names = item.cast.slice(0, 4).map(c => c.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : undefined;
  })();

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1` : '';
  };

  const embedUrl = getYoutubeEmbedUrl(item.trailerUrl);
  const isDarkPreview = Boolean(heroCustomizer.forceDarkMode);
  const isDarkHero = Boolean(heroCustomizer.artOn || heroCustomizer.forceDarkMode);
  const activeColorScheme =
    colorScheme ||
    (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-color-scheme') : null) ||
    loadUserSettings().colorScheme ||
    'orange';
  const forcedDarkThemeAttr = isDarkPreview
    ? (appTheme === 'oled-black' ? 'oled-black' : 'dark')
    : undefined;
  const hasHeroRatingBadge = Boolean(
    heroCustomizer.showRatingBadge &&
      ((item.imdbRating && item.imdbRating > 0) || (item.tmdbRating && item.tmdbRating > 0))
  );
  const hasAnyHeroActionButton =
    heroCustomizer.showWatchlistButton !== false ||
    heroCustomizer.showWatchedButton !== false ||
    heroCustomizer.showFavoriteButton !== false ||
    heroCustomizer.showAddToListButton !== false;

  return (
    <div
      ref={modalScrollRef}
      data-theme={forcedDarkThemeAttr}
      data-color-scheme={isDarkPreview ? activeColorScheme : undefined}
      className="fixed inset-0 z-50 w-full h-full overflow-y-auto animate-window-open flex flex-col transition-colors duration-300 bg-[var(--modal-bg)] text-[var(--text-primary)]"
    >
      
      {/* ========================================================================= */}
      {/* CINEMATIC HERO SECTION                                                    */}
      {/* ========================================================================= */}
      <div className={`relative w-full ${
        heroCustomizer.artOn
          ? !isPosterCardVisible
            ? 'min-h-[100dvh]'
            : 'min-h-[340px] sm:min-h-[540px] md:min-h-[620px] lg:min-h-[680px]'
          : 'min-h-0'
      } flex flex-col justify-between shrink-0 border-b border-[var(--border-subtle)] transition-colors ${
        isDarkHero ? 'bg-[#000000]' : 'bg-[var(--modal-bg)]'
      }`}>
        
        {/* Backdrop Image Layer (Visible across all screens, full clarity at 100% opacity) */}
        {heroCustomizer.artOn && (
          <div className="absolute inset-0 z-0 overflow-hidden bg-[#000000]">
            <SafeImage
              src={item.backdropUrl || item.posterUrl}
              fallbackSrc={item.fallbackPosterUrl}
              fallbackTitle={item.title}
              alt={item.title}
              containerClassName="bg-black"
              className={`w-full h-full object-cover ${
                !isPosterCardVisible ? 'object-[center_20%]' : 'object-center'
              } transition-opacity duration-300`}
              style={{ opacity: effectiveArtOpacity }}
            />
            {/* Dynamic directional gradient overlay: leaves top/right artwork crisp while ensuring bottom-left text legibility */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                background: !isPosterCardVisible
                  ? effectiveArtOpacity >= 0.98
                    ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.48) 32%, rgba(0,0,0,0.08) 58%, transparent 100%), linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.22) 38%, transparent 66%)'
                    : effectiveArtOpacity >= 0.75
                    ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.58) 38%, rgba(0,0,0,0.16) 66%, transparent 100%), linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.34) 42%, transparent 72%)'
                    : 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.68) 44%, rgba(0,0,0,0.24) 72%, transparent 100%), linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 45%, transparent 75%)'
                  : effectiveArtOpacity >= 0.98
                  ? 'linear-gradient(to right, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 30%, transparent 62%), linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 35%)'
                  : effectiveArtOpacity >= 0.75
                  ? 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 35%, rgba(0,0,0,0.12) 70%, transparent 100%), linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 45%)'
                  : 'linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.1) 100%), linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 50%)'
              }}
            />
          </div>
        )}

        {/* Top Floating Action Bar */}
        <div className="relative z-20 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-3.5 sm:py-4 flex items-center justify-between">
          {/* Left: Back button + Production label */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleBackClick}
              aria-label={
                previewHistory.length > 0 && previewHistory[previewHistory.length - 1].person
                  ? `Back to ${previewHistory[previewHistory.length - 1].person!.name}`
                  : 'Back to library'
              }
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition border active:scale-95 shadow-xs ${
                isDarkHero
                  ? 'bg-black/55 hover:bg-black/75 text-white border-white/20 backdrop-blur-md'
                  : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
              }`}
            >
              <ArrowLeft className={`w-4 h-4 ${isDarkHero ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
              <span className="truncate max-w-[160px] sm:max-w-xs">
                {previewHistory.length > 0 && previewHistory[previewHistory.length - 1].person
                  ? `Back to ${previewHistory[previewHistory.length - 1].person!.name}`
                  : 'Back'}
              </span>
            </button>

            {item.productionCompany && (
              <span className={`hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold border truncate max-w-[280px] ${
                isDarkHero
                  ? 'bg-black/55 text-white/90 backdrop-blur-md border-white/20'
                  : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
              }`}>
                {item.productionCompany}
              </span>
            )}
          </div>

          {/* Right: Customizer Tool, Rearrange Tool, Favorite, Close button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* ADD TO LIST TRIGGER (ICON ONLY) */}
            {heroCustomizer.showAddToListButton !== false && (
              <div ref={desktopListContainerRef} className="relative hidden sm:inline-block">
                <button
                  onClick={() => {
                    const next = !isAddingToList;
                    setIsAddingToList(next);
                    if (next) setShowCustomizer(false);
                  }}
                  aria-label="Add to Collection List"
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                    isDarkHero
                      ? 'bg-black/55 hover:bg-black/75 text-white border-white/20 backdrop-blur-md'
                      : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
                  } ${isAddingToList ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  title="Add to Collection List"
                >
                  <FolderPlus className={`w-4 h-4 ${isDarkHero ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
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
                        const alreadyIn = isItemInCustomList(list);
                        return (
                          <button
                            key={list.id}
                            onClick={() => {
                              if (alreadyIn) {
                                onRemoveItemFromList?.(list.id, item.id);
                              } else {
                                onAddItemToList(list.id, item.id, item);
                              }
                              setIsAddingToList(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                              alreadyIn
                                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold hover:bg-[var(--accent-primary)]/20'
                                : 'hover:bg-[var(--chip-bg)] text-[var(--text-primary)]'
                            }`}
                          >
                            <span className="truncate">{list.title}</span>
                            {alreadyIn && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW CUSTOMIZER TRIGGER (ICON ONLY) */}
            <div ref={customizerContainerRef} className="relative">
              <button
                onClick={() => {
                  const next = !showCustomizer;
                  setShowCustomizer(next);
                  if (next) setIsAddingToList(false);
                }}
                aria-label="Preview Customizer"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                  isDarkHero
                    ? 'bg-black/55 hover:bg-black/75 text-white border-white/20 backdrop-blur-md'
                    : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
                } ${showCustomizer ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                title="Preview Customizer"
              >
                <Sliders className={`w-4 h-4 ${isDarkHero ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
              </button>

              {/* PREVIEW CUSTOMIZER POPUP CARD */}
              {showCustomizer && (
                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-84 max-w-sm sm:max-w-none max-h-[80vh] sm:max-h-[540px] overflow-y-auto p-5 bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] z-50 animate-fade-in no-scrollbar mx-auto sm:mx-0">
                  {/* Header: Title + Art On / Off + Hide Arrow */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span className="text-xs font-black tracking-wider uppercase text-[var(--text-primary)]">
                        PREVIEW CUSTOMIZER
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
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

                      <button
                        onClick={() => setShowCustomizer(false)}
                        className="p-1 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] text-[var(--text-secondary)] transition active:scale-95 flex items-center justify-center"
                        title="Hide Customizer"
                        aria-label="Hide Customizer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Backdrop Opacity Range */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                      <span>Backdrop Opacity:</span>
                      <span className="text-[var(--accent-primary)] font-mono font-bold">
                        {heroCustomizer.artOn ? `${Math.round(effectiveArtOpacity * 100)}%` : '0%'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={heroCustomizer.artOn ? effectiveArtOpacity : 0}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateHeroCustomizer(isDesktopViewport ? { desktopOpacity: val } : { opacity: val });
                      }}
                      disabled={!heroCustomizer.artOn}
                      className="w-full h-2 bg-[var(--chip-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)] disabled:opacity-30"
                    />
                  </div>

                  {/* Force Dark Preview Window Toggle (Cinema Mode in Light Theme) */}
                  <div className="flex items-center justify-between py-2 border-t border-[var(--border-subtle)] mt-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        Force Dark Window
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Dark theater mode even in light theme
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateHeroCustomizer({ forceDarkMode: !heroCustomizer.forceDarkMode })}
                      className={`px-3 py-1 rounded-full text-xs font-black transition active:scale-95 ${
                        heroCustomizer.forceDarkMode
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                          : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {heroCustomizer.forceDarkMode ? 'DARK ON' : 'AUTO'}
                    </button>
                  </div>

                  {/* Title Image Card Visibility Toggle */}
                  <div className="flex items-center justify-between py-2 border-t border-[var(--border-subtle)] mt-2">
                    <div className="flex flex-col pr-2">
                      <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                        {isPosterCardVisible ? (
                          <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        )}
                        Title Image Card
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Hide poster card to spotlight background artwork
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleShowPosterCard}
                      className={`px-3 py-1 rounded-full text-xs font-black transition active:scale-95 shrink-0 ${
                        isPosterCardVisible
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                          : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isPosterCardVisible ? 'SHOW' : 'HIDE'}
                    </button>
                  </div>

                  {/* Adaptive Poster Color Glow Toggle */}
                  <div className={`flex items-center justify-between py-2 border-t border-[var(--border-subtle)] mt-2 transition-opacity ${isPosterCardVisible ? 'opacity-100' : 'opacity-45'}`}>
                    <div className="flex flex-col pr-2">
                      <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        Poster Color Glow
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Subtle directional aura matching poster colors
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePosterGlow}
                      className={`px-3 py-1 rounded-full text-xs font-black transition active:scale-95 shrink-0 ${
                        isPosterGlowEnabled
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                          : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isPosterGlowEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Poster Glow Contrast Progress Bar */}
                  <div className={`space-y-2 pb-2 pt-1.5 transition-opacity ${isPosterGlowEnabled && isPosterCardVisible ? 'opacity-100' : 'opacity-45'}`}>
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                      <span>Glow Contrast</span>
                      <div className="flex items-center gap-2">
                        {Math.abs(effectivePosterGlowContrast - 1.0) >= 0.05 && isPosterGlowEnabled && (
                          <button
                            type="button"
                            onClick={() => handleChangePosterGlowContrast(1.0)}
                            className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] underline"
                          >
                            Reset
                          </button>
                        )}
                        <span className="text-[var(--accent-primary)] font-mono font-bold tabular-nums">
                          {isPosterGlowEnabled ? `${Math.round(effectivePosterGlowContrast * 100)}%` : 'OFF'}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 rounded-full bg-[var(--chip-bg)] border border-[var(--border-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-75"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((effectivePosterGlowContrast - 0.25) / 1.75) * 100))}%`,
                        }}
                      />
                      <input
                        type="range"
                        min="0.25"
                        max="2.0"
                        step="0.05"
                        value={effectivePosterGlowContrast}
                        onChange={(e) => handleChangePosterGlowContrast(Number(e.target.value))}
                        disabled={!isPosterGlowEnabled}
                        aria-label="Poster glow contrast"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--text-secondary)]">
                      <span>Soft 25%</span>
                      <span>Balanced 100%</span>
                      <span>High 200%</span>
                    </div>
                  </div>

                  {/* REFRESH ARTWORK & BANNER (THIS TITLE ONLY) */}
                  <div className="border-t border-[var(--border-subtle)] my-3" />
                  <div className="text-[11px] font-black text-[var(--text-secondary)] tracking-wider uppercase mb-2 flex items-center justify-between">
                    <span>REFRESH ARTWORK (THIS TITLE):</span>
                    {reloadFeedback && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in flex items-center gap-1">
                        <Check className="w-3 h-3" /> {reloadFeedback}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Option 1: Reload Poster Image */}
                    <div className="flex items-center justify-between py-1 bg-[var(--chip-bg)] p-2.5 rounded-2xl border border-[var(--border-subtle)]">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-primary)]">Poster Image</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Fetch high-res poster artwork</span>
                      </div>
                      <button
                        onClick={() => handleReloadSingleArtwork('poster')}
                        disabled={reloadingType !== null}
                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {reloadingType === 'poster' ? (
                          <>
                            <RotateCcw className="w-3 h-3 animate-spin" />
                            <span>Reloading...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Reload Poster</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Option 2: Reload Banner Artwork */}
                    <div className="flex items-center justify-between py-1 bg-[var(--chip-bg)] p-2.5 rounded-2xl border border-[var(--border-subtle)]">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-primary)]">Backdrop Banner</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Fetch high-res hero banner</span>
                      </div>
                      <button
                        onClick={() => handleReloadSingleArtwork('banner')}
                        disabled={reloadingType !== null}
                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {reloadingType === 'banner' ? (
                          <>
                            <RotateCcw className="w-3 h-3 animate-spin" />
                            <span>Reloading...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Reload Banner</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Option 3: Reload Both Poster & Banner */}
                    <button
                      onClick={() => handleReloadSingleArtwork('all')}
                      disabled={reloadingType !== null}
                      className="w-full py-2 px-3 rounded-2xl text-xs font-bold bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                    >
                      {reloadingType === 'all' ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
                          <span>Reloading Poster & Banner...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Reload Poster & Banner Together</span>
                        </>
                      )}
                    </button>
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

                    {/* 7. Watch Trailer Button (in Overview) */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[var(--text-primary)]">Watch Trailer (Overview)</span>
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

                    {/* Hide Customizer Action at Bottom */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] mt-3">
                      <button
                        onClick={() => setShowCustomizer(false)}
                        className="w-full py-2 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span>Hide Customizer</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PENCIL ICON: REARRANGE & CUSTOMIZE CARDS */}
            <button
              onClick={() => {
                setShowCustomizer(false);
                setIsAddingToList(false);
                setShowRearrangeModal(true);
              }}
              aria-label="Rearrange cards"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border active:scale-95 ${
                isDarkHero
                  ? 'bg-black/55 hover:bg-black/75 text-white border-white/20 backdrop-blur-md'
                  : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]/80 border-[var(--border-subtle)]'
              }`}
              title="Rearrange & Customize Cards Order"
            >
              <Pencil className={`w-4 h-4 ${isDarkHero ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
            </button>

            {/* Filled Blood Red Cross Close Button */}
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition active:scale-95 bg-red-600 hover:bg-red-700 text-white shadow-md border border-red-700 shrink-0"
              title="Close (Esc)"
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
          /* Hero Content Area: With Left Poster Card OR Bottom-Left Artwork-First Layout */
          <div
            className={`relative z-10 w-full ${
              !isPosterCardVisible
                ? heroCustomizer.artOn
                  ? 'mt-auto px-4 sm:px-8 lg:px-12 xl:px-16 pt-20 sm:pt-32 md:pt-40 pb-8 sm:pb-12 flex flex-col items-start'
                  : 'px-4 sm:px-8 lg:px-12 xl:px-16 pt-3 sm:pt-5 pb-6 sm:pb-8 flex flex-col items-start'
                : 'px-4 sm:px-8 lg:px-12 xl:px-16 pb-6 sm:pb-8 pt-2 sm:pt-4 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-8'
            }`}
          >
            {/* Anchored Left Poster / Album Artwork with Directional Color Glow */}
            {isPosterCardVisible && (
              <PosterAmbientGlow
                src={item.posterUrl || item.backdropUrl}
                fallbackSrc={item.fallbackPosterUrl}
                enabled={isPosterGlowEnabled}
                contrast={effectivePosterGlowContrast}
                isDarkSurface={
                  isDarkHero ||
                  isDarkPreview ||
                  (appTheme ? appTheme !== 'cream' : (typeof document !== 'undefined' &&
                    document.documentElement.getAttribute('data-theme') !== 'cream'))
                }
                className="w-48 xs:w-56 sm:w-64 md:w-76 lg:w-84 flex-none aspect-[2/3] select-none transition-transform duration-300 hover:scale-[1.02] self-start shrink-0"
              >
                <div
                  className={`w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg sm:shadow-2xl border ${
                    isDarkHero
                      ? 'bg-[#181c14] border-white/25'
                      : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
                  }`}
                >
                  <SafeImage
                    src={item.posterUrl || item.backdropUrl}
                    fallbackSrc={item.fallbackPosterUrl}
                    alt={item.title}
                    fallbackTitle={item.title}
                    containerClassName={isDarkHero ? 'bg-[#181c14]' : ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              </PosterAmbientGlow>
            )}

            {/* Hero Information Hierarchy */}
            <div
              className={`min-w-0 flex flex-col items-start text-left transition-all ${
                !isPosterCardVisible ? 'w-full max-w-xl sm:max-w-2xl' : 'flex-1 w-full'
              } ${
                heroCustomizer.showTitleBackgroundCard
                  ? isDarkHero
                    ? 'p-4 sm:p-6 rounded-3xl bg-black/60 backdrop-blur-md border border-white/15 shadow-xl'
                    : 'p-4 sm:p-6 rounded-3xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] shadow-sm'
                  : ''
              }`}
            >
              {/* Media Type & Metadata Line (Above title when Poster Card is visible; tucked cleanly under Title when Poster Card is hidden) */}
              {isPosterCardVisible && (
                <div className={`flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider mb-1 ${
                  isDarkHero ? 'text-white/90' : 'text-[var(--text-secondary)]'
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
              )}

              {/* Primary Title + Quick Copy Title Button */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className={`${
                  !isPosterCardVisible
                    ? 'text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.06]'
                    : 'text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-[1.18] sm:leading-[1.12]'
                } text-left ${
                  isDarkHero
                    ? 'text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]'
                    : 'text-[var(--text-primary)]'
                }`}>
                  {item.title}
                </h1>
                <button
                  type="button"
                  onClick={() => handleCopyTitle(item.title)}
                  title={isTitleCopied ? 'Title copied!' : 'Copy title'}
                  aria-label={isTitleCopied ? 'Title copied' : `Copy ${item.title}`}
                  className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition active:scale-90 cursor-pointer shrink-0 ${
                    isTitleCopied
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : isDarkHero
                      ? 'bg-black/45 hover:bg-black/70 text-white/90 hover:text-white border-white/20 backdrop-blur-xs'
                      : 'bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                >
                  {isTitleCopied ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  )}
                </button>
              </div>

              {/* Tagline Quote */}
              {heroCustomizer.showTaglineQuote && item.tagline && (
                <p className={`mt-1.5 text-xs sm:text-sm italic line-clamp-2 text-left ${
                  isDarkHero ? 'text-white/85' : 'text-[var(--text-secondary)]'
                }`}>
                  "{item.tagline}"
                </p>
              )}

              {/* Compact Type + Year + Rating Row */}
              <div className={`${!isPosterCardVisible ? 'mt-3' : 'mt-3.5'} flex flex-wrap items-center justify-start gap-2.5`}>
                {/* 1. Rating Badge (Tertiary Theme Color in Preview Window — redirects to IMDb ratings page) */}
                {hasHeroRatingBadge && (
                  item.imdbRating && item.imdbRating > 0 ? (
                    <a
                      href={getImdbRatingPageUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open IMDb ratings page (${item.imdbRating.toFixed(1)}/10)`}
                      aria-label={`Open IMDb ratings page for ${item.title} (${item.imdbRating.toFixed(1)}/10)`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] border border-[var(--border-subtle)] shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="tabular-nums font-black">{item.imdbRating.toFixed(1)}</span>
                    </a>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                      isDarkHero
                        ? 'bg-black/60 text-white border-white/20 backdrop-blur-xs'
                        : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                    }`}>
                      <Star className="w-3.5 h-3.5 fill-[var(--accent-primary)] text-[var(--accent-primary)]" />
                      <span className="tabular-nums font-black">{(item.tmdbRating || 0).toFixed(1)}</span>
                      <span className="text-[10px] uppercase font-bold opacity-75">TMDB</span>
                    </span>
                  )
                )}

                {/* Compact Type · Year · Duration when Poster Card is Hidden */}
                {!isPosterCardVisible && (
                  <div className={`flex flex-wrap items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider ${
                    isDarkHero ? 'text-white/90' : 'text-[var(--text-secondary)]'
                  }`}>
                    {hasHeroRatingBadge && <span aria-hidden="true">·</span>}
                    <span className="flex items-center gap-1">
                      {item.type === 'tv' ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                      {item.type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                    </span>
                    {item.year ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.year}</span>
                      </>
                    ) : null}
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
                )}

                {/* Vote Count (only shown in standard poster mode to keep bottom-left artwork view clean) */}
                {isPosterCardVisible && item.voteCount > 0 && (
                  <span className={`text-xs font-medium tabular-nums ${
                    isDarkHero ? 'text-white/75' : 'text-[var(--text-secondary)]'
                  }`}>
                    ({item.voteCount.toLocaleString()} votes)
                  </span>
                )}

                {/* % Match Score Badge (Optional) */}
                {heroCustomizer.showMatchScore && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] border border-[var(--border-subtle)] text-xs font-extrabold shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>{Math.min(99, Math.max(82, Math.round(((item.imdbRating || 0) || 7.5) * 10 + 12)))}% Match</span>
                  </span>
                )}

                {/* HD Quality Badge (Optional) */}
                {heroCustomizer.showHDQualityBadge && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                    isDarkHero
                      ? 'bg-black/60 text-white/90 border-white/20'
                      : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}>
                    4K Ultra HD
                  </span>
                )}
              </div>

              {/* Genre Pills (filled with app theme primary color for crisp contrast & visibility) */}
              {heroCustomizer.showGenrePills && item.genres && item.genres.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center justify-start gap-1.5">
                  {(!isPosterCardVisible ? item.genres.slice(0, 4) : item.genres).map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold shadow-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis in Hero (strictly respects Synopsis in Hero Show/Hide setting) */}
              {heroCustomizer.showSynopsisInHero && item.overview && (
                <p className={`mt-3 text-xs sm:text-sm ${
                  !isPosterCardVisible ? 'line-clamp-2 sm:line-clamp-3 max-w-xl' : 'line-clamp-2 max-w-2xl'
                } leading-relaxed text-left ${
                  isDarkHero ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]' : 'text-[var(--text-secondary)]'
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
                        isDarkHero
                          ? 'bg-black/60 text-white border-white/20'
                          : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      <StreamingBrandIcon name={p.name} className="w-3.5 h-3.5 rounded-sm" />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hero Action Buttons (Unchanged app action buttons in both modes) */}
              {hasAnyHeroActionButton && (
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
                        ? 'bg-[#F5C518] hover:bg-[#E2B616] text-[#121212] font-black border border-[#DFB00F]'
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
                  <div ref={mobileListContainerRef} className="relative sm:hidden">
                    <button
                      onClick={() => {
                        const next = !isAddingToList;
                        setIsAddingToList(next);
                        if (next) setShowCustomizer(false);
                      }}
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
                            const alreadyIn = isItemInCustomList(list);
                            return (
                              <button
                                key={list.id}
                                onClick={() => {
                                  if (alreadyIn) {
                                    onRemoveItemFromList?.(list.id, item.id);
                                  } else {
                                    onAddItemToList(list.id, item.id, item);
                                  }
                                  setIsAddingToList(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                  alreadyIn
                                    ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold hover:bg-[var(--accent-primary)]/20'
                                    : 'hover:bg-[var(--chip-bg)] text-[var(--text-primary)]'
                                }`}
                              >
                                <span className="truncate">{list.title}</span>
                                {alreadyIn && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtle Divider Line below Hero (when art is off) */}
      {!heroCustomizer.artOn && (
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="border-t border-[var(--border-subtle)] mt-2 mb-2" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTENT AREA: Dynamic Configurable Cards Order                            */}
      {/* ========================================================================= */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-6 space-y-6 flex-1">
        
        {cardSections.map((section) => {
          if (!section.visible) return null;

          // 1. Personal Rating (Your Verdict) Card — INDEPENDENT
          if (section.id === 'journal') {
            const activeRatingTag = resolveRatingTag(activeUserState);

            return (
              <div key="journal" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs">
                {/* Redesigned Clean Theme-Consistent Verdict & Rating Tier Selector */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
                        Your Verdict
                      </h3>
                      {activeRatingTag ? (
                        <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                          · {activeRatingTag.label} · {activeRatingTag.numericRating.toFixed(1)}/10
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">
                          · Pick a tier
                        </span>
                      )}
                    </div>
                    {activeRatingTag && (
                      <button
                        type="button"
                        onClick={() => onSetRating(item.id, undefined, undefined, item)}
                        className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Unified Segmented Verdict Tray */}
                  <div
                    role="radiogroup"
                    aria-label="Rating tier"
                    className="p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5"
                  >
                    {RATING_TAGS.map((tag, index) => {
                      const isSelected = activeRatingTag?.id === tag.id;
                      const tierLevel = index + 1;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            if (isSelected) {
                              onSetRating(item.id, undefined, undefined, item);
                            } else {
                              onSetRating(item.id, tag.numericRating, tag.id, item);
                            }
                          }}
                          className={`group relative px-4 py-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.98] flex flex-col justify-between min-h-[92px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-sm'
                              : 'bg-transparent hover:bg-[var(--bg-surface-card)] text-[var(--text-primary)]'
                          }`}
                        >
                          {/* Top Row: Subtle 4-Step Tier Meter & Selected Check */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1" aria-hidden="true">
                              {[1, 2, 3, 4].map(step => (
                                <span
                                  key={step}
                                  className={`h-1 w-3.5 rounded-full transition-colors ${
                                    step <= tierLevel
                                      ? isSelected
                                        ? 'bg-[var(--bg-primary)]'
                                        : 'bg-[var(--accent-primary)]/70 group-hover:bg-[var(--accent-primary)]'
                                      : isSelected
                                      ? 'bg-[var(--bg-primary)]/25'
                                      : 'bg-[var(--border-subtle)]'
                                  }`}
                                />
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-[var(--bg-primary)]/20 text-[var(--bg-primary)] flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              )}
                              <span className="w-7.5 h-7.5 rounded-full bg-[#F5C518] text-[#121212] border border-[#DFB00F] shadow-2xs flex items-center justify-center text-[10px] font-black tracking-tight tabular-nums leading-none shrink-0">
                                {tag.numericRating.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Tier Filled Pill Label & Description */}
                          <div>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold tracking-tight leading-none shadow-2xs ${tag.activeBgClass} ${tag.colorClass} ${
                                isSelected ? 'ring-1 ring-white/35' : ''
                              }`}
                            >
                              {tag.label}
                            </span>
                            <p
                              className={`mt-2 text-xs leading-relaxed ${
                                isSelected ? 'text-[var(--bg-primary)]/85' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {tag.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    Saved privately on this device.
                  </p>
                </div>
              </div>
            );
          }

          // 1A. Personal Notes & Reflections Card — INDEPENDENT
          if (section.id === 'notes') {
            return (
              <div key="notes" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                    <label className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                      PERSONAL NOTES &amp; REFLECTIONS
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px]">
                    {isSavedFeedback && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold animate-fade-in bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
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
                      onSetNotes(item.id, notesDraft, item);
                      if (notesDraft.trim()) {
                        setIsSavedFeedback(true);
                        if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
                        savedFeedbackTimerRef.current = setTimeout(() => setIsSavedFeedback(false), 2200);
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
                              onSetNotes(item.id, '', item);
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
                          onSetNotes(item.id, notesDraft, item);
                          setIsSavedFeedback(true);
                          if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
                          savedFeedbackTimerRef.current = setTimeout(() => setIsSavedFeedback(false), 2500);
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
            );
          }

          // 1B. INDEPENDENT MOVIE PROGRESS CARD (Movies Only - Hidden for TV Series)
          if (section.id === 'progress') {
            if (item.type !== 'movie') return null;

            const remainingMins =
              item.runtime && item.runtime > 0 && progressPercent > 0 && progressPercent < 100
                ? Math.max(1, Math.round((item.runtime * (100 - progressPercent)) / 100))
                : 0;

            return (
              <div
                key="progress"
                className="w-full p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                      MOVIE PROGRESS
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isWatched || progressPercent >= 95
                          ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border-[var(--border-subtle)]'
                          : progressPercent > 0
                          ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
                          : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      {isWatched || progressPercent >= 95
                        ? 'Completed'
                        : progressPercent > 0
                        ? 'In Progress'
                        : 'Not Started'}
                    </span>
                    {remainingMins > 0 && (
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        ~{formatHoursMinutes(remainingMins)} left
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-black text-[var(--accent-primary)] tabular-nums">
                    {progressPercent}%
                  </span>
                </div>

                {/* Thick M3 Tactile Track */}
                <div className="relative w-full py-1.5 flex items-center select-none">
                  <div className="relative w-full h-3.5 rounded-full flex items-center overflow-hidden bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
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
                    <div className="w-2 h-6 rounded-full bg-[var(--accent-primary)] shadow-sm ring-2 ring-[var(--bg-primary)]" />
                  </div>

                  {/* Native Range Input */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressPercent}
                    onChange={e => onSetProgress(item.id, Number(e.target.value), item)}
                    aria-label="Movie watch progress"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                </div>

                {/* Quick Milestone Chips */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  {[0, 25, 50, 75, 100].map(pct => {
                    const isActive = progressPercent === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => onSetProgress(item.id, pct, item)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition active:scale-95 cursor-pointer border ${
                          isActive
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent shadow-xs'
                            : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        {pct === 0 ? 'Reset' : pct === 100 ? '100% Done' : `${pct}%`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // 2. TV SERIES EPISODES CHECKLIST (FULL WIDTH)
          if (section.id === 'episodes') {
            if (item.type !== 'tv') return null;
            
            const eps = Array.from({ length: episodesPerSeason }, (_, i) => i + 1);
            const isAllCompletedInSeason = eps.every(ep => !!activeUserState?.tvProgress?.completedEpisodes[`s${effectiveSeason}e${ep}`]);

            return (
              <div key="episodes" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      Episodes & Seasons
                    </h3>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
                      S{effectiveSeason} · {eps.length} Eps
                    </span>
                    {onToggleSeasonEpisodes && (
                      <button
                        type="button"
                        onClick={() => onToggleSeasonEpisodes(item.id, effectiveSeason, eps, !isAllCompletedInSeason, item)}
                        className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer select-none active:scale-95 shadow-2xs border ${
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
                          type="button"
                          onClick={() => setSelectedSeason(s)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap cursor-pointer select-none ${
                            effectiveSeason === s
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
                    const epKey = `s${effectiveSeason}e${ep}`;
                    const isDone = !!activeUserState?.tvProgress?.completedEpisodes?.[epKey];

                    return (
                      <button
                        key={ep}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTVEpisode(item.id, effectiveSeason, ep, item);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium transition cursor-pointer select-none active:scale-95 shadow-2xs border ${
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

          // 3. STORY OVERVIEW CARD — INDEPENDENT
          if (section.id === 'overview') {
            return (
              <div key="overview" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    Overview
                  </h3>
                  {heroCustomizer.showWatchTrailerButton && item.trailerUrl && embedUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingTrailer(true);
                        modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isPlayingTrailer ? 'Playing Trailer' : 'Watch Trailer'}</span>
                    </button>
                  )}
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                  {item.overview || 'No synopsis available for this title.'}
                </p>
              </div>
            );
          }

          // 4. TITLE & PRODUCTION DETAILS CARD — INDEPENDENT
          if (section.id === 'production') {
            const hasProductionDetails = Boolean(
              mostLovedEpisode ||
              totalLengthLabel ||
              formattedReleaseDate ||
              (item.type === 'tv' && seasonsCount && totalEpisodesCount) ||
              topCrewSummary ||
              topActorsSummary ||
              (item.originalTitle && item.originalTitle !== item.title) ||
              item.productionCompany ||
              item.country ||
              item.budget ||
              item.boxOffice ||
              item.status
            );

            if (!hasProductionDetails) return null;

            return (
              <div key="production" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  Title &amp; Production Details
                </h3>

                {/* Highlight: Most Loved Episode (for TV Series when episode ratings exist) */}
                {mostLovedEpisode && (
                  <div className="p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)] block">
                        Most Loved Episode
                      </span>
                      <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] truncate mt-0.5">
                        S{mostLovedEpisode.seasonNumber} E{mostLovedEpisode.episodeNumber} · {mostLovedEpisode.title}
                      </div>
                    </div>
                    {typeof mostLovedEpisode.rating === 'number' && mostLovedEpisode.rating > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5C518] text-[#121212] text-xs font-black tabular-nums border border-[#DFB00F] shadow-2xs shrink-0">
                        <Star className="w-3 h-3 fill-[#121212] text-[#121212]" />
                        <span>{mostLovedEpisode.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5 text-xs text-[var(--text-secondary)]">
                  {totalLengthLabel && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">{item.type === 'tv' ? 'Total Length:' : 'Length:'}</span>
                      <strong className="text-[var(--text-primary)] text-right truncate">{totalLengthLabel}</strong>
                    </div>
                  )}
                  {formattedReleaseDate && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Release Date:</span>
                      <strong className="text-[var(--text-primary)] text-right">{formattedReleaseDate}</strong>
                    </div>
                  )}
                  {item.type === 'tv' && seasonsCount && totalEpisodesCount && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Run:</span>
                      <strong className="text-[var(--text-primary)] text-right">
                        {seasonsCount} {seasonsCount === 1 ? 'Season' : 'Seasons'} · {totalEpisodesCount} Eps
                      </strong>
                    </div>
                  )}
                  {topCrewSummary && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5 sm:col-span-2 md:col-span-1">
                      <span className="shrink-0">{topCrewSummary.label}:</span>
                      <strong className="text-[var(--text-primary)] text-right truncate" title={topCrewSummary.value}>
                        {topCrewSummary.value}
                      </strong>
                    </div>
                  )}
                  {topActorsSummary && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5 sm:col-span-2">
                      <span className="shrink-0">Starring:</span>
                      <strong className="text-[var(--text-primary)] text-right truncate" title={topActorsSummary}>
                        {topActorsSummary}
                      </strong>
                    </div>
                  )}
                  {item.originalTitle && item.originalTitle !== item.title && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Original Title:</span>
                      <strong className="text-[var(--text-primary)] text-right truncate">{item.originalTitle}</strong>
                    </div>
                  )}
                  {item.productionCompany && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Production:</span>
                      <strong className="text-[var(--text-primary)] text-right truncate">{item.productionCompany}</strong>
                    </div>
                  )}
                  {item.country && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Country:</span>
                      <strong className="text-[var(--text-primary)] text-right truncate">{item.country}</strong>
                    </div>
                  )}
                  {item.budget && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Budget:</span>
                      <strong className="text-[var(--text-primary)] text-right">{item.budget}</strong>
                    </div>
                  )}
                  {item.boxOffice && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Box Office:</span>
                      <strong className="text-[var(--text-primary)] text-right">{item.boxOffice}</strong>
                    </div>
                  )}
                  {item.status && (
                    <div className="flex justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="shrink-0">Status:</span>
                      <strong className="text-[var(--text-primary)] text-right">{item.status}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // 5. WHERE TO WATCH CARD (INDEPENDENT) - Direct Landing URLs
          if (section.id === 'where_to_watch') {
            return (
              <div key="where_to_watch" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                        Where to Watch
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Click any platform to jump directly to this {item.type === 'tv' ? 'series' : 'movie'}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-1 rounded-full">
                      {cleanedProviders.length} Platform{cleanedProviders.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Clean structured grid of interactive streaming platform tiles with direct landing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {cleanedProviders.map((p, idx) => (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => openStreamingPlatform(p.name, item.title, item.type, item.year)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openStreamingPlatform(p.name, item.title, item.type, item.year);
                          }
                        }}
                        title={`Watch "${item.title}" directly on ${p.name}`}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:scale-[1.02] active:scale-[0.98] transition group shadow-2xs cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StreamingBrandIcon name={p.name} className="w-6 h-6 rounded-lg shrink-0 shadow-xs" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-0.5">
                              <span>Direct landing</span>
                              <ExternalLink className="w-2.5 h-2.5 text-[var(--accent-primary)]" />
                            </span>
                          </div>
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
                  <span>Direct streaming links verified</span>
                  <span className="font-semibold text-[var(--accent-primary)]">Instant Play · 4K / HD</span>
                </div>
              </div>
            );
          }

          // 6. TOP CAST & CREW CARD (INDEPENDENT) - Full Screen Minimal Profile on Click
          if (section.id === 'cast_crew') {
            const displayedCast = item.cast ? (showAllCast ? item.cast : item.cast.slice(0, 6)) : [];
            const hasMoreCast = item.cast && item.cast.length > 6;

            return (
              <div key="cast_crew" className="w-full p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                        Top Cast & Crew
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Tap any artist to view full-screen profile, biography & credits
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-1 rounded-full">
                      {item.cast?.length || 0} Actors recorded
                    </span>
                  </div>

                  {/* Cast Members Grid with Profile Avatars */}
                  {displayedCast.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {displayedCast.map((c, idx) => (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedPerson({
                            name: c.name,
                            character: c.character,
                            roleType: 'cast',
                            profileUrl: c.profileUrl,
                            currentMediaTitle: item.title,
                            currentMediaId: item.id
                          })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedPerson({
                                name: c.name,
                                character: c.character,
                                roleType: 'cast',
                                profileUrl: c.profileUrl,
                                currentMediaTitle: item.title,
                                currentMediaId: item.id
                              });
                            }
                          }}
                          title={`View full-screen profile for ${c.name}`}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface-elevated)] hover:scale-[1.01] active:scale-[0.98] transition group shadow-2xs cursor-pointer select-none"
                        >
                          {/* Cast Member Profile Avatar */}
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-[var(--bg-surface-elevated)] shrink-0 border border-[var(--border-subtle)] ring-2 ring-transparent group-hover:ring-[var(--accent-primary)]/40 transition flex items-center justify-center">
                            {c.profileUrl ? (
                              <SafeImage
                                src={c.profileUrl}
                                alt={c.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <User className="w-5 h-5 text-[var(--text-secondary)]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] truncate">
                              {c.character}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[var(--chip-bg)] text-xs text-[var(--text-secondary)]">
                      Featured narrative cast & production crew recorded in journal.
                    </div>
                  )}

                  {/* Show All / Show Less Cast Button */}
                  {hasMoreCast && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => setShowAllCast(!showAllCast)}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition active:scale-95 shadow-2xs"
                      >
                        <span>{showAllCast ? 'Show Fewer Cast' : `Show All ${item.cast!.length} Cast Members`}</span>
                        {showAllCast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
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
                      {item.crew.slice(0, 6).map((cr, idx) => (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedPerson({
                            name: cr.name,
                            job: cr.job,
                            roleType: 'crew',
                            profileUrl: cr.profileUrl,
                            currentMediaTitle: item.title,
                            currentMediaId: item.id
                          })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedPerson({
                                name: cr.name,
                                job: cr.job,
                                roleType: 'crew',
                                profileUrl: cr.profileUrl,
                                currentMediaTitle: item.title,
                                currentMediaId: item.id
                              });
                            }
                          }}
                          title={`View full-screen profile for ${cr.name}`}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface-elevated)] hover:scale-[1.01] active:scale-[0.98] transition group shadow-2xs cursor-pointer select-none"
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg-surface-elevated)] shrink-0 border border-[var(--border-subtle)] ring-2 ring-transparent group-hover:ring-[var(--accent-primary)]/40 transition flex items-center justify-center">
                            {cr.profileUrl ? (
                              <SafeImage
                                src={cr.profileUrl}
                                alt={cr.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <User className="w-4 h-4 text-[var(--text-secondary)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                              {cr.name}
                            </div>
                            <div className="text-[10px] font-semibold text-[var(--accent-primary)] truncate uppercase tracking-wider">
                              {cr.job}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 7. SIMILAR TITLES RECOMMENDATION CARD — INDEPENDENT
          if (section.id === 'similar_titles') {
            if (!isLoadingSimilar && similarTitles.length === 0) return null;

            return (
              <section
                key="similar_titles"
                aria-label="Similar Titles"
                className="w-full p-5 sm:p-7 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4"
              >
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--accent-primary)] shrink-0 ui-sparkle-alive" />
                      <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                        Similar Titles
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 truncate">
                      More {item.type === 'tv' ? 'series' : 'movies'} matching the taste &amp; vibe of {item.title}
                    </p>
                  </div>

                  {similarTitles.length > 2 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleScrollSimilarRail('left')}
                        disabled={!similarCanScrollLeft}
                        aria-label="Scroll similar titles left"
                        className={`p-2 rounded-full transition focus:outline-none shadow-2xs border border-[var(--border-subtle)] active:scale-95 ${
                          !similarCanScrollLeft
                            ? 'opacity-35 cursor-not-allowed bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                            : 'bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] cursor-pointer'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollSimilarRail('right')}
                        disabled={!similarCanScrollRight}
                        aria-label="Scroll similar titles right"
                        className={`p-2 rounded-full transition focus:outline-none shadow-2xs border border-[var(--border-subtle)] active:scale-95 ${
                          !similarCanScrollRight
                            ? 'opacity-35 cursor-not-allowed bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                            : 'bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] cursor-pointer'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingSimilar && similarTitles.length === 0 ? (
                  <div className="flex gap-3.5 sm:gap-5 overflow-hidden pt-1 pb-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-none w-[134px] sm:w-[160px] md:w-[176px] aspect-[2/3] rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    ref={similarRailRef}
                    onScroll={updateSimilarScrollButtons}
                    className="flex gap-3.5 sm:gap-5 overflow-x-auto no-scrollbar pb-2 pt-1 snap-x snap-mandatory"
                  >
                    {similarTitles.map((simItem) => {
                      const simState = resolveStateForMediaItem(simItem, userStates, mediaItemsRef.current);
                      return (
                        <div
                          key={simItem.id}
                          className="flex-none w-[134px] sm:w-[160px] md:w-[176px] snap-start"
                        >
                          <MoviePoster
                            item={simItem}
                            userState={simState}
                            onClick={() => handleSelectSimilarTitle(simItem)}
                            onToggleWatchlist={onToggleWatchlist}
                            onMarkWatched={onMarkWatched || onToggleWatched}
                            onMarkWatching={onMarkWatching}
                            onDismissFromWatching={onDismissFromWatching}
                            onToggleFavorite={onToggleFavorite}
                            onAddMediaToLibrary={onAddMediaToLibrary}
                            onRemoveFromWatchlist={
                              onRemoveFromWatchlist ||
                              ((id) => {
                                if (simState?.inWatchlist) {
                                  onToggleWatchlist(id, simItem);
                                }
                              })
                            }
                            customLists={customLists}
                            onAddItemToList={onAddItemToList}
                            onRemoveItemFromList={onRemoveItemFromList}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          }

          return null;
        })}
      </div>

      {/* ========================================================================= */}
      {/* REARRANGE & CUSTOMIZE CARDS MODAL DIALOG                                  */}
      {/* ========================================================================= */}
      {showRearrangeModal && (
        <div
          onClick={() => setShowRearrangeModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-6 text-[var(--text-primary)] animate-scale-up"
          >
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

            <div className="flex items-center justify-between gap-2 mt-3 mb-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Reorder or hide any preview card independently.
              </p>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] tabular-nums shrink-0">
                {cardSections.filter(s => s.visible).length}/{cardSections.length} visible
              </span>
            </div>

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
                      title={section.visible ? 'Hide card' : 'Show card'}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSectionOrder}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
                {cardSections.some(s => !s.visible) && (
                  <button
                    onClick={() => saveSections(cardSections.map(s => ({ ...s, visible: true })))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--chip-bg)] transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show All</span>
                  </button>
                )}
              </div>

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

      {/* Full Screen Minimal Details Page for Cast & Crew with Big Circular Portrait */}
      {selectedPerson && (
        <CastCrewDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onSelectPerson={(newPerson) => setSelectedPerson(newPerson)}
          currentMedia={item}
          currentCast={item?.cast || []}
          currentCrew={item?.crew || []}
          mediaItems={mediaItems}
          userStates={userStates}
          onSelectMedia={handleSelectCreditFromActorProfile}
          onToggleWatchlist={onToggleWatchlist}
          tmdbApiKey={loadUserSettings().tmdbApiKey}
        />
      )}
    </div>
  );
};
