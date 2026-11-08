import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MediaItem, PersonalMediaState, CastMember, CrewMember } from '../../types/movie';
import { fetchTMDBPersonDetails, TMDBPersonDetails, fetchTMDBDetails, TMDBPersonCredit } from '../../services/tmdb';
import { SafeImage } from './SafeImage';
import {
  X,
  ArrowLeft,
  User,
  Star,
  ExternalLink,
  Film,
  Tv,
  Calendar,
  MapPin,
  Bookmark,
  Check,
  Heart,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

export interface SelectedPersonInfo {
  name: string;
  character?: string;
  job?: string;
  roleType: 'cast' | 'crew';
  profileUrl?: string;
  currentMediaTitle?: string;
  currentMediaId?: string;
  tmdbPersonId?: number;
}

export type CreditSortOption =
  | 'default'
  | 'rating_desc'
  | 'rating_asc'
  | 'year_desc'
  | 'year_asc'
  | 'title_asc'
  | 'title_desc';

export type CreditTypeFilter = 'all' | 'movie' | 'tv';

interface CastCrewDetailModalProps {
  person: SelectedPersonInfo | null;
  onClose: () => void;
  onSelectPerson?: (person: SelectedPersonInfo) => void;
  currentMedia?: MediaItem | null;
  currentCast?: CastMember[];
  currentCrew?: CrewMember[];
  mediaItems?: MediaItem[];
  userStates?: Record<string, PersonalMediaState>;
  onSelectMedia?: (item: MediaItem) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  tmdbApiKey?: string;
}

export const CastCrewDetailModal: React.FC<CastCrewDetailModalProps> = ({
  person,
  onClose,
  onSelectPerson,
  currentMedia,
  currentCast = [],
  currentCrew = [],
  mediaItems = [],
  userStates = {},
  onSelectMedia,
  onToggleWatchlist,
  tmdbApiKey,
}) => {
  // Active person being inspected
  const [activePerson, setActivePerson] = useState<SelectedPersonInfo | null>(person);
  const [details, setDetails] = useState<TMDBPersonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [crewFilter, setCrewFilter] = useState<'all' | 'cast' | 'crew'>('all');
  const [loadingCreditId, setLoadingCreditId] = useState<string | number | null>(null);

  // Filmography filter & arrangement states
  const [creditSort, setCreditSort] = useState<CreditSortOption>('default');
  const [creditTypeFilter, setCreditTypeFilter] = useState<CreditTypeFilter>('all');
  const [creditSearchQuery, setCreditSearchQuery] = useState('');
  const [creditOnlyWatchlist, setCreditOnlyWatchlist] = useState(false);

  const handleSelectCredit = async (cr: TMDBPersonCredit) => {
    if (loadingCreditId !== null) return;
    setLoadingCreditId(cr.id);

    try {
      const rawId = cr.tmdbId || (typeof cr.id === 'number' ? cr.id : parseInt(String(cr.id).replace(/\D/g, ''), 10)) || 0;
      const yearNum = typeof cr.year === 'number' ? cr.year : parseInt(String(cr.year || 0), 10) || 0;

      // 1. Check if this exact title already exists in the user's library or cached media
      const existing = mediaItems.find(
        (m) =>
          (rawId > 0 && m.tmdbId === rawId) ||
          m.id === String(cr.id) ||
          m.id === `tmdb-${cr.id}` ||
          m.id === `tmdb-${cr.type}-${cr.id}` ||
          (m.title.toLowerCase() === cr.title.toLowerCase() && (!yearNum || m.year === yearNum))
      );

      if (existing) {
        if (onSelectMedia) {
          onSelectMedia(existing);
        } else {
          onClose();
        }
        return;
      }

      // 2. Build responsive initial MediaItem conforming strictly to MediaItem interface
      const initialMedia: MediaItem = {
        id: `tmdb-${cr.type}-${rawId || cr.id}`,
        title: cr.title,
        originalTitle: cr.title,
        type: cr.type,
        year: yearNum,
        releaseDate: cr.releaseDate || (yearNum ? `${yearNum}-01-01` : ''),
        posterUrl: cr.posterUrl || '',
        fallbackPosterUrl: cr.posterUrl || '',
        backdropUrl: cr.backdropUrl || cr.posterUrl || '',
        genres: [],
        tmdbRating: cr.rating,
        imdbRating: cr.rating,
        voteCount: cr.voteCount || 0,
        tmdbId: rawId > 0 ? rawId : undefined,
        overview: cr.overview || `Starring ${activePerson?.name || 'ensemble cast'}${cr.character ? ` as ${cr.character}` : ''}.`,
        cast: activePerson
          ? [
              {
                name: activePerson.name,
                character: cr.character || '',
                profileUrl: activePerson.profileUrl,
              },
            ]
          : [],
        crew: [],
      };

      // Open movie/series preview with history preserved in parent
      if (onSelectMedia) {
        onSelectMedia(initialMedia);
      } else {
        onClose();
      }

      // 3. Concurrently fetch and hydrate full details from TMDB (synopsis, trailer, watch providers, crew, seasons, episodes)
      if (rawId > 0) {
        try {
          const fullDetails = await fetchTMDBDetails(rawId, cr.type, tmdbApiKey);
          if (fullDetails && onSelectMedia) {
            onSelectMedia(fullDetails);
          }
        } catch (err) {
          console.warn('Background TMDB hydration for credit completed with fallback:', err);
        }
      }
    } catch (err) {
      console.error('Error selecting filmography credit:', err);
    } finally {
      setLoadingCreditId(null);
    }
  };

  const handleToggleCreditWatchlist = (e: React.MouseEvent, cr: TMDBPersonCredit) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onToggleWatchlist) return;

    const rawId = cr.tmdbId || (typeof cr.id === 'number' ? cr.id : parseInt(String(cr.id).replace(/\D/g, ''), 10)) || 0;
    const yearNum = typeof cr.year === 'number' ? cr.year : parseInt(String(cr.year || 0), 10) || 0;

    const existing = mediaItems.find(
      (m) =>
        (rawId > 0 && m.tmdbId === rawId) ||
        m.id === String(cr.id) ||
        m.id === `tmdb-${cr.id}` ||
        m.id === `tmdb-${cr.type}-${cr.id}` ||
        (m.title.toLowerCase() === cr.title.toLowerCase() && (!yearNum || m.year === yearNum))
    );

    const mediaToSave: MediaItem = existing || {
      id: `tmdb-${cr.type}-${rawId || cr.id}`,
      title: cr.title,
      originalTitle: cr.title,
      type: cr.type,
      year: yearNum,
      releaseDate: cr.releaseDate || (yearNum ? `${yearNum}-01-01` : ''),
      posterUrl: cr.posterUrl || '',
      fallbackPosterUrl: cr.posterUrl || '',
      backdropUrl: cr.backdropUrl || cr.posterUrl || '',
      genres: [],
      tmdbRating: cr.rating,
      imdbRating: cr.rating,
      voteCount: cr.voteCount || 0,
      tmdbId: rawId > 0 ? rawId : undefined,
      overview: cr.overview || `Starring ${activePerson?.name || 'ensemble cast'}${cr.character ? ` as ${cr.character}` : ''}.`,
      cast: activePerson
        ? [
            {
              name: activePerson.name,
              character: cr.character || '',
              profileUrl: activePerson.profileUrl,
            },
          ]
        : [],
      crew: [],
    };

    onToggleWatchlist(mediaToSave.id, mediaToSave);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when person prop changes
  useEffect(() => {
    setActivePerson(person);
    setCreditSearchQuery('');
  }, [person]);

  // CRITICAL: Always open modal at the very top (scrollTop = 0)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [activePerson?.name]);

  useEffect(() => {
    // Lock background body scroll while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Immediate scroll to top on mount
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key press & handle Android back navigation
  useEffect(() => {
    if (!activePerson) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Push state for Android back button preservation
    const stateObj = { modal: 'cast-crew-detail', name: activePerson.name };
    window.history.pushState(stateObj, '');

    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activePerson, onClose]);

  // Fetch full details & credits from TMDB whenever activePerson changes
  useEffect(() => {
    if (!activePerson) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsBioExpanded(false);

    fetchTMDBPersonDetails(activePerson.name, activePerson.tmdbPersonId, tmdbApiKey)
      .then((data) => {
        if (isMounted) {
          setDetails(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch person details:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activePerson, tmdbApiKey]);

  // Handle switching to a different artist from the current movie's cast/crew rail
  const handleChoosePerson = (newPerson: SelectedPersonInfo) => {
    setActivePerson(newPerson);
    if (onSelectPerson) {
      onSelectPerson(newPerson);
    }
    // Instantly reset scroll to top of the new artist profile
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Compile full cast & crew from current media for the rapid-switcher rail
  const allCurrentPeople = useMemo(() => {
    const list: {
      key: string;
      name: string;
      subtitle: string;
      roleType: 'cast' | 'crew';
      profileUrl?: string;
      character?: string;
      job?: string;
    }[] = [];

    const seen = new Set<string>();

    const castList = currentCast.length > 0 ? currentCast : (currentMedia?.cast || []);
    const crewList = currentCrew.length > 0 ? currentCrew : (currentMedia?.crew || []);

    if (crewFilter === 'all' || crewFilter === 'cast') {
      castList.forEach((c) => {
        if (!c.name) return;
        const key = `cast-${c.name.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({
          key,
          name: c.name,
          subtitle: c.character || 'Actor',
          roleType: 'cast',
          profileUrl: c.profileUrl,
          character: c.character,
        });
      });
    }

    if (crewFilter === 'all' || crewFilter === 'crew') {
      crewList.forEach((cr) => {
        if (!cr.name) return;
        const key = `crew-${cr.name.toLowerCase()}-${cr.job || ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({
          key,
          name: cr.name,
          subtitle: cr.job || 'Crew',
          roleType: 'crew',
          profileUrl: cr.profileUrl,
          job: cr.job,
        });
      });
    }

    return list;
  }, [currentCast, currentCrew, currentMedia, crewFilter]);

  // Find all titles in user's library featuring this person
  const libraryAppearances = useMemo(() => {
    if (!activePerson) return [];
    const normalizedName = activePerson.name.trim().toLowerCase();

    return mediaItems.filter((item) => {
      const inCast = item.cast?.some(
        (c) => c.name.trim().toLowerCase() === normalizedName
      );
      const inCrew = item.crew?.some(
        (cr) => cr.name.trim().toLowerCase() === normalizedName
      );
      return inCast || inCrew;
    });
  }, [activePerson, mediaItems]);

  // Compute counts for filmography media type filters
  const creditCounts = useMemo(() => {
    if (!details?.credits) return { all: 0, movie: 0, tv: 0 };
    let movie = 0;
    let tv = 0;
    details.credits.forEach((c) => {
      if (c.type === 'movie') movie++;
      else if (c.type === 'tv') tv++;
    });
    return { all: details.credits.length, movie, tv };
  }, [details?.credits]);

  // Compute filtered and arranged/sorted filmography credits
  const displayedCredits = useMemo(() => {
    if (!details?.credits) return [];

    let list = [...details.credits];

    // 1. Filter by media type (All / Movies / Series)
    if (creditTypeFilter !== 'all') {
      list = list.filter((c) => c.type === creditTypeFilter);
    }

    // 2. Filter by search query (Title, Character, or Job)
    if (creditSearchQuery.trim()) {
      const q = creditSearchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.character && c.character.toLowerCase().includes(q)) ||
          (c.job && c.job.toLowerCase().includes(q))
      );
    }

    // 3. Filter by In Library / Watchlist
    if (creditOnlyWatchlist) {
      list = list.filter((cr) => {
        const rawId =
          cr.tmdbId ||
          (typeof cr.id === 'number' ? cr.id : parseInt(String(cr.id).replace(/\D/g, ''), 10)) ||
          0;
        const yearNum = typeof cr.year === 'number' ? cr.year : parseInt(String(cr.year || 0), 10) || 0;
        const existingMedia = mediaItems.find(
          (m) =>
            (rawId > 0 && m.tmdbId === rawId) ||
            m.id === String(cr.id) ||
            m.id === `tmdb-${cr.id}` ||
            m.id === `tmdb-${cr.type}-${cr.id}` ||
            (m.title.toLowerCase() === cr.title.toLowerCase() && (!yearNum || m.year === yearNum))
        );
        const targetId = existingMedia ? existingMedia.id : `tmdb-${cr.type}-${rawId || cr.id}`;
        const state = userStates[targetId];
        return Boolean(state?.inWatchlist || state?.isFavorite || state?.isWatched);
      });
    }

    // 4. Arrange / Sort (Highest rating first, Lowest rating first, Year, Title, Default)
    if (creditSort === 'rating_desc') {
      // Highest rating shows first; unrated (0 or undefined) placed at the bottom
      list.sort((a, b) => {
        const rateA = typeof a.rating === 'number' && a.rating > 0 ? a.rating : -1;
        const rateB = typeof b.rating === 'number' && b.rating > 0 ? b.rating : -1;
        if (rateB !== rateA) return rateB - rateA;
        return (b.voteCount || 0) - (a.voteCount || 0);
      });
    } else if (creditSort === 'rating_asc') {
      // Lowest rating shows first; unrated (0 or undefined) placed at the bottom
      list.sort((a, b) => {
        const rateA = typeof a.rating === 'number' && a.rating > 0 ? a.rating : 999;
        const rateB = typeof b.rating === 'number' && b.rating > 0 ? b.rating : 999;
        if (rateA !== rateB) return rateA - rateB;
        return (a.voteCount || 0) - (b.voteCount || 0);
      });
    } else if (creditSort === 'year_desc') {
      // Newest release first
      list.sort((a, b) => {
        const yrA = typeof a.year === 'number' ? a.year : parseInt(String(a.year || 0), 10) || 0;
        const yrB = typeof b.year === 'number' ? b.year : parseInt(String(b.year || 0), 10) || 0;
        return yrB - yrA;
      });
    } else if (creditSort === 'year_asc') {
      // Oldest release first
      list.sort((a, b) => {
        const yrA = typeof a.year === 'number' ? a.year : parseInt(String(a.year || 0), 10) || 9999;
        const yrB = typeof b.year === 'number' ? b.year : parseInt(String(b.year || 0), 10) || 9999;
        return yrA - yrB;
      });
    } else if (creditSort === 'title_asc') {
      // Alphabetical A to Z
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (creditSort === 'title_desc') {
      // Alphabetical Z to A
      list.sort((a, b) => b.title.localeCompare(a.title));
    }

    return list;
  }, [
    details?.credits,
    creditTypeFilter,
    creditSearchQuery,
    creditOnlyWatchlist,
    creditSort,
    mediaItems,
    userStates,
  ]);

  if (!activePerson) return null;

  // Best profile photo: TMDB high-res person profile or the fallback URL passed in
  const displayProfileUrl = details?.profileUrl || activePerson.profileUrl;

  // Calculate age if birthday is available
  const getAge = (birthday?: string, deathday?: string) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const m = endDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const age = getAge(details?.birthday, details?.deathday);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // External URLs
  const imdbSearchUrl = details?.imdbId
    ? `https://www.imdb.com/name/${details.imdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(activePerson.name)}&s=nm`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${activePerson.name} actor filmography`
  )}`;
  const tmdbSearchUrl = details?.id
    ? `https://www.themoviedb.org/person/${details.id}`
    : `https://www.themoviedb.org/search/person?query=${encodeURIComponent(activePerson.name)}`;

  const currentMediaTitle = currentMedia?.title || activePerson.currentMediaTitle;

  const modalContent = (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] animate-fade-in flex flex-col"
    >
      {/* Minimal Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--header-bg)] border-b border-[var(--border-subtle)] px-4 sm:px-8 lg:px-12 py-3 transition-colors">
        <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-bold transition active:scale-95 shadow-2xs border border-[var(--border-subtle)]"
            title="Back to media preview (Esc)"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Back</span>
          </button>

          {/* Central Role Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-2xs">
            <User className="w-3.5 h-3.5" />
            <span>{activePerson.roleType === 'cast' ? 'Actor Profile' : 'Crew Profile'}</span>
          </div>

          {/* Action icons & close button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href={imdbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 border border-[var(--border-subtle)] hidden sm:inline-flex"
              title="Search person on IMDb"
              aria-label="Search person on IMDb"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 border border-[var(--border-subtle)]"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Strictly Ordered by User Hierarchy */}
      <main className="flex-1 w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-7 sm:space-y-9">
        {/* ========================================================================= */}
        {/* 1. ACTOR PROFILE HERO (Big Circular Image, Name & Highlighted Pills)       */}
        {/* ========================================================================= */}
        <section className="flex flex-col items-center text-center relative pt-2">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-6 w-60 h-60 sm:w-80 sm:h-80 rounded-full bg-[var(--accent-secondary)]/30 blur-3xl pointer-events-none -z-10"
            aria-hidden="true"
          />

          {/* Big Circular Image of the Actor / Crew Member */}
          <div className="relative group">
            <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full overflow-hidden bg-[var(--bg-surface-card)] border-4 border-[var(--bg-surface-card)] shadow-2xl ring-4 ring-[var(--accent-primary)]/25 transition-transform duration-300 group-hover:scale-[1.02] flex items-center justify-center">
              {displayProfileUrl ? (
                <SafeImage
                  src={displayProfileUrl}
                  alt={activePerson.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                  <User className="w-16 h-16 sm:w-20 sm:h-20 stroke-[1.5] text-[var(--text-secondary)]" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-wider mt-1 opacity-70">No Portrait</span>
                </div>
              )}
            </div>

            {/* Department Tag Floating Badge */}
            {(details?.knownForDepartment || activePerson.roleType) && (
              <span className="absolute bottom-1 right-2 sm:bottom-2 sm:right-4 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md border-2 border-[var(--bg-primary)]">
                {details?.knownForDepartment || (activePerson.roleType === 'cast' ? 'Acting' : 'Production')}
              </span>
            )}
          </div>

          {/* Actor Name */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight mt-5">
            {activePerson.name}
          </h1>

          {/* Context Role Highlight */}
          <div className="mt-1.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] max-w-lg">
            {activePerson.roleType === 'cast' && activePerson.character ? (
              <span>
                Portrayed <strong className="text-[var(--accent-primary)] font-black">{activePerson.character}</strong>
                {currentMediaTitle ? ` in "${currentMediaTitle}"` : ''}
              </span>
            ) : activePerson.job ? (
              <span>
                <strong className="text-[var(--accent-primary)] font-black">{activePerson.job}</strong>
                {currentMediaTitle ? ` for "${currentMediaTitle}"` : ''}
              </span>
            ) : (
              <span>Featured Artist & Contributor</span>
            )}
          </div>

          {/* Highlighted & Bold Born and Location Pills */}
          {(details?.birthday || details?.placeOfBirth) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {details.birthday && (
                <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border border-[var(--border-subtle)] shadow-xs text-xs sm:text-sm font-black tracking-tight">
                  <Calendar className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
                  <span>
                    Born {formatDate(details.birthday)}
                    {age ? ` · Age ${age}` : ''}
                  </span>
                </div>
              )}

              {details.placeOfBirth && (
                <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border border-[var(--border-subtle)] shadow-xs text-xs sm:text-sm font-black tracking-tight">
                  <MapPin className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
                  <span>{details.placeOfBirth}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick External Actions Row */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2">
            <a
              href={imdbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] text-xs font-black hover:opacity-90 active:scale-95 transition shadow-2xs border border-[var(--border-subtle)]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View on IMDb</span>
            </a>

            <a
              href={tmdbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-surface-elevated)] active:scale-95 transition shadow-2xs border border-[var(--border-subtle)]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>TMDB Profile</span>
            </a>

            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-surface-elevated)] active:scale-95 transition shadow-2xs border border-[var(--border-subtle)]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Google Search</span>
            </a>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. ALL CAST & CREW SECTION (Placed near top for rapid switching)          */}
        {/* ========================================================================= */}
        {allCurrentPeople.length > 0 && (
          <section className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                    All Cast & Crew {currentMediaTitle ? `of "${currentMediaTitle}"` : ''}
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                  Tap any artist to switch profile view instantly
                </p>
              </div>

              {/* Sub-filter tabs (All, Cast, Crew) */}
              <div className="inline-flex p-0.5 rounded-full bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-[10px] sm:text-[11px] font-bold self-start sm:self-auto">
                <button
                  onClick={() => setCrewFilter('all')}
                  className={`px-2.5 py-1 rounded-full transition active:scale-95 ${
                    crewFilter === 'all'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All ({currentCast.length + currentCrew.length})
                </button>
                {currentCast.length > 0 && (
                  <button
                    onClick={() => setCrewFilter('cast')}
                    className={`px-2.5 py-1 rounded-full transition active:scale-95 ${
                      crewFilter === 'cast'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Cast ({currentCast.length})
                  </button>
                )}
                {currentCrew.length > 0 && (
                  <button
                    onClick={() => setCrewFilter('crew')}
                    className={`px-2.5 py-1 rounded-full transition active:scale-95 ${
                      crewFilter === 'crew'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Crew ({currentCrew.length})
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal touch scroll rail with circular avatars */}
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
              {allCurrentPeople.map((personItem) => {
                const isActive = personItem.name.trim().toLowerCase() === activePerson.name.trim().toLowerCase();
                return (
                  <button
                    key={personItem.key}
                    type="button"
                    onClick={() =>
                      handleChoosePerson({
                        name: personItem.name,
                        character: personItem.character,
                        job: personItem.job,
                        roleType: personItem.roleType,
                        profileUrl: personItem.profileUrl,
                        currentMediaTitle: currentMediaTitle,
                        currentMediaId: currentMedia?.id || activePerson.currentMediaId,
                      })
                    }
                    className={`snap-start shrink-0 min-w-[105px] max-w-[125px] sm:min-w-[120px] sm:max-w-[140px] p-2 sm:p-2.5 rounded-2xl border text-center transition active:scale-95 cursor-pointer flex flex-col items-center justify-between ${
                      isActive
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] shadow-xs'
                        : 'bg-[var(--chip-bg)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--accent-primary)]/40 shadow-2xs'
                    }`}
                    title={`View ${personItem.name} profile`}
                  >
                    {/* Circular Portrait */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] mb-1.5 shrink-0 flex items-center justify-center">
                      {personItem.profileUrl ? (
                        <SafeImage
                          src={personItem.profileUrl}
                          alt={personItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[var(--text-secondary)]" />
                      )}

                      {/* Active indicator dot */}
                      {isActive && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--accent-primary)] border-2 border-[var(--bg-primary)] shadow-xs" />
                      )}
                    </div>

                    <div className="w-full min-w-0">
                      <div
                        className={`text-xs truncate ${
                          isActive
                            ? 'font-black text-[var(--accent-primary)]'
                            : 'font-bold text-[var(--text-primary)]'
                        }`}
                      >
                        {personItem.name}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5 font-medium">
                        {personItem.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 3. BIOGRAPHY AND CAREER CARD                                              */}
        {/* ========================================================================= */}
        <section className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tracking-tight">
              Biography & Career
            </h2>
            {details?.knownForDepartment && (
              <span className="text-[10px] sm:text-xs font-bold text-[var(--accent-primary)] bg-[var(--chip-bg)] px-2.5 py-0.5 rounded-full">
                {details.knownForDepartment}
              </span>
            )}
          </div>

          {isLoading && !details ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
              <span>Retrieving biography from TMDB...</span>
            </div>
          ) : details?.biography ? (
            <div className="relative">
              <p
                className={`text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line ${
                  !isBioExpanded ? 'line-clamp-4' : ''
                }`}
              >
                {details.biography}
              </p>
              {details.biography.length > 280 && (
                <button
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)] hover:underline active:scale-95 transition"
                >
                  <span>{isBioExpanded ? 'Show less' : 'Read full biography'}</span>
                  {isBioExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
              No extended biography is recorded yet on TMDB. Check the official IMDb or Wikipedia profile links above for complete background.
            </p>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 4. IN YOUR LIBRARY & WATCHLIST (Clean Grid of Saved Titles with this artist) */}
        {/* ========================================================================= */}
        <section className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                In Your Library & Watchlist
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
                Saved titles in your personal collection featuring {activePerson.name}
              </p>
            </div>
            <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)]">
              {libraryAppearances.length} Saved
            </span>
          </div>

          {/* Clean Grid of Titles in User's Library */}
          {libraryAppearances.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
              {libraryAppearances.map((item) => {
                const state = userStates[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (onSelectMedia) {
                        onSelectMedia(item);
                      }
                      onClose();
                    }}
                    className="group p-2 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer text-left shadow-2xs hover:shadow-xs active:scale-95 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                    title={`Open preview for ${item.title}`}
                  >
                    <div className="w-full">
                      <div className="aspect-2/3 rounded-xl overflow-hidden bg-[var(--bg-surface-elevated)] mb-2 relative">
                        <SafeImage
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 z-10">
                          {state?.isWatched && (
                            <span className="p-1 rounded-full bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] shadow-xs" title="Watched">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                          {state?.inWatchlist && !state?.isWatched && (
                            <span className="p-1 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs" title="Watchlist">
                              <Bookmark className="w-2.5 h-2.5 fill-current" />
                            </span>
                          )}
                          {state?.isFavorite && (
                            <span className="p-1 rounded-full bg-rose-500 text-white shadow-xs" title="Favorite">
                              <Heart className="w-2.5 h-2.5 fill-current" />
                            </span>
                          )}
                        </div>

                        {/* Interactive hover indicator */}
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Film className="w-4 h-4 text-black" />
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium">
                        <span>{item.year || 'Unknown'}</span>
                        <span>·</span>
                        <span className="uppercase font-bold">{item.type}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[var(--chip-bg)] text-xs text-[var(--text-secondary)] text-center font-medium">
              No saved titles featuring {activePerson.name} in your personal library yet.
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 5. NOTABLE FILMOGRAPHY SECTION (FROM TMDB)                                */}
        {/* ========================================================================= */}
        {details?.credits && details.credits.length > 0 && (
          <section className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-xs space-y-4">
            {/* Header & Title Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                  Notable Filmography & Credits
                </h2>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
                  Click any title to open its full preview window with trailer, synopsis, and details
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2.5 py-1 rounded-full border border-[var(--border-subtle)]">
                  {displayedCredits.length === details.credits.length
                    ? `${details.credits.length} Titles`
                    : `${displayedCredits.length} of ${details.credits.length} Titles`}
                </span>
              </div>
            </div>

            {/* Filter & Arrange Toolbar */}
            <div className="p-3 rounded-2xl bg-[var(--chip-bg)]/80 border border-[var(--border-subtle)] space-y-2.5">
              {/* Row 1: Media Type Tabs & Arrange/Sort Dropdown */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Media Type Tabs */}
                <div className="flex items-center p-0.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setCreditTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      creditTypeFilter === 'all'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All ({creditCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditTypeFilter('movie')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                      creditTypeFilter === 'movie'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Film className="w-3 h-3" />
                    <span>Movies ({creditCounts.movie})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditTypeFilter('tv')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                      creditTypeFilter === 'tv'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Tv className="w-3 h-3" />
                    <span>Series ({creditCounts.tv})</span>
                  </button>
                </div>

                {/* Arrange / Sort Selector */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                  <label htmlFor="credit-sort-select" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Arrange:
                  </label>
                  <select
                    id="credit-sort-select"
                    value={creditSort}
                    onChange={(e) => setCreditSort(e.target.value as CreditSortOption)}
                    className="bg-transparent text-[11px] font-bold text-[var(--text-primary)] outline-none cursor-pointer pr-1"
                  >
                    <option value="default" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      Default Order
                    </option>
                    <option value="rating_desc" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      ⭐ Highest Rating First
                    </option>
                    <option value="rating_asc" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      ⭐ Lowest Rating First
                    </option>
                    <option value="year_desc" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      📅 Newest First (Year)
                    </option>
                    <option value="year_asc" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      ⏳ Oldest First (Year)
                    </option>
                    <option value="title_asc" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      🔤 Title (A → Z)
                    </option>
                    <option value="title_desc" className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                      🔤 Title (Z → A)
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 2: Quick Rating Buttons, In-Library Filter & Filmography Search */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] mr-0.5 uppercase tracking-wider hidden sm:inline">
                    Quick Arrange:
                  </span>
                  {/* Highest Rating Quick Button */}
                  <button
                    type="button"
                    onClick={() => setCreditSort(creditSort === 'rating_desc' ? 'default' : 'rating_desc')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      creditSort === 'rating_desc'
                        ? 'bg-amber-400 text-black border-amber-300 shadow-xs'
                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-amber-400/40'
                    }`}
                    title="Arrange by highest rating"
                  >
                    <Star className={`w-3 h-3 ${creditSort === 'rating_desc' ? 'fill-black' : 'text-amber-400 fill-amber-400'}`} />
                    <span>Highest Rating</span>
                  </button>

                  {/* Lowest Rating Quick Button */}
                  <button
                    type="button"
                    onClick={() => setCreditSort(creditSort === 'rating_asc' ? 'default' : 'rating_asc')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      creditSort === 'rating_asc'
                        ? 'bg-amber-400 text-black border-amber-300 shadow-xs'
                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-amber-400/40'
                    }`}
                    title="Arrange by lowest rating"
                  >
                    <Star className={`w-3 h-3 ${creditSort === 'rating_asc' ? 'fill-black' : 'text-amber-400 fill-amber-400'}`} />
                    <span>Lowest Rating</span>
                  </button>

                  {/* In Watchlist / Library Toggle */}
                  <button
                    type="button"
                    onClick={() => setCreditOnlyWatchlist(!creditOnlyWatchlist)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      creditOnlyWatchlist
                        ? 'bg-[#881337] text-white border-rose-300/40 shadow-xs'
                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-rose-400/30'
                    }`}
                    title="Filter by shows in your Watchlist or Library"
                  >
                    <Bookmark className={`w-3 h-3 ${creditOnlyWatchlist ? 'fill-current' : ''}`} />
                    <span>In Library</span>
                  </button>

                  {/* Reset button if any filter active */}
                  {(creditSort !== 'default' || creditTypeFilter !== 'all' || creditOnlyWatchlist || creditSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreditSort('default');
                        setCreditTypeFilter('all');
                        setCreditOnlyWatchlist(false);
                        setCreditSearchQuery('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-all cursor-pointer"
                      title="Reset all filters and sorting"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Filmography Quick Search */}
                <div className="relative min-w-[140px] max-w-[200px] w-full sm:w-auto">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    value={creditSearchQuery}
                    onChange={(e) => setCreditSearchQuery(e.target.value)}
                    placeholder="Filter by title..."
                    className="w-full pl-7 pr-6 py-1 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                  {creditSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCreditSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Empty state or Credits Grid */}
            {displayedCredits.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl bg-[var(--chip-bg)] border border-dashed border-[var(--border-subtle)] text-center space-y-3">
                <SlidersHorizontal className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-60" />
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  No titles match your active filters
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                  Try adjusting your arrange order, media type filter, or search term to see titles in this filmography.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCreditSort('default');
                    setCreditTypeFilter('all');
                    setCreditSearchQuery('');
                    setCreditOnlyWatchlist(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                {displayedCredits.map((cr, idx) => {
                  const isLoadingThis = loadingCreditId === cr.id;
                  const rawId = cr.tmdbId || (typeof cr.id === 'number' ? cr.id : parseInt(String(cr.id).replace(/\D/g, ''), 10)) || 0;
                  const yearNum = typeof cr.year === 'number' ? cr.year : parseInt(String(cr.year || 0), 10) || 0;
                  const existingMedia = mediaItems.find(
                    (m) =>
                      (rawId > 0 && m.tmdbId === rawId) ||
                      m.id === String(cr.id) ||
                      m.id === `tmdb-${cr.id}` ||
                      m.id === `tmdb-${cr.type}-${cr.id}` ||
                      (m.title.toLowerCase() === cr.title.toLowerCase() && (!yearNum || m.year === yearNum))
                  );
                  const targetId = existingMedia ? existingMedia.id : `tmdb-${cr.type}-${rawId || cr.id}`;
                  const isInWatchlist = Boolean(userStates[targetId]?.inWatchlist);

                  return (
                    <div
                      key={`${cr.id}-${idx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (loadingCreditId === null) {
                          handleSelectCredit(cr);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (loadingCreditId === null && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleSelectCredit(cr);
                        }
                      }}
                      className="group p-2 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all text-left shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                      title={`Open full preview for ${cr.title}`}
                    >
                      <div className="w-full">
                        <div className="aspect-2/3 rounded-xl overflow-hidden bg-[var(--bg-surface-elevated)] mb-2 relative">
                          {cr.posterUrl ? (
                            <SafeImage
                              src={cr.posterUrl}
                              alt={cr.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[var(--text-secondary)] text-[10px]">
                              {cr.type === 'tv' ? (
                                <Tv className="w-6 h-6 mb-1 opacity-50" />
                              ) : (
                                <Film className="w-6 h-6 mb-1 opacity-50" />
                              )}
                              <span className="font-semibold">{cr.title}</span>
                            </div>
                          )}

                          {/* Top-right small watchlist button in deep red colour */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleToggleCreditWatchlist(e, cr);
                            }}
                            className={`absolute top-1.5 right-1.5 z-20 w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer border ${
                              isInWatchlist
                                ? 'bg-[#F5C518] text-[#121212] font-black border border-[#DFB00F] opacity-100 shadow-xs ring-2 ring-[#DFB00F]/30'
                                : 'bg-[var(--accent-primary)]/90 hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] border border-white/25 opacity-0 group-hover:opacity-100 hover:scale-110 focus:opacity-100 backdrop-blur-xs'
                            }`}
                            title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                            aria-label={isInWatchlist ? `Remove ${cr.title} from Watchlist` : `Add ${cr.title} to Watchlist`}
                          >
                            {isLoadingThis ? (
                              <Loader2 className="w-3 h-3 text-white animate-spin" />
                            ) : isInWatchlist ? (
                              <Bookmark className="w-3 h-3 text-white fill-current drop-shadow-xs" />
                            ) : (
                              <Bookmark className="w-3 h-3 text-white drop-shadow-xs" />
                            )}
                          </button>

                          {/* Rating badge with dynamic highlight when rating sorting is active */}
                          {cr.rating && cr.rating > 0 ? (
                            <div
                              className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md backdrop-blur-xs text-[10px] font-black flex items-center gap-0.5 shadow-xs pointer-events-none transition-all ${
                                creditSort.startsWith('rating')
                                  ? 'bg-amber-400 text-black ring-1 ring-amber-300 shadow-amber-900/30 font-black'
                                  : 'bg-black/75 text-amber-300'
                              }`}
                            >
                              <Star className={`w-2.5 h-2.5 ${creditSort.startsWith('rating') ? 'fill-black' : 'fill-current'}`} />
                              <span>{cr.rating.toFixed(1)}</span>
                            </div>
                          ) : null}
                        </div>

                        <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] truncate transition-colors" title={cr.title}>
                          {cr.title}
                        </h3>
                        <div className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5 font-medium">
                          {cr.character ? (
                            <span>as {cr.character}</span>
                          ) : cr.job ? (
                            <span className="capitalize">{cr.job}</span>
                          ) : (
                            <span>{cr.year || 'Film'}</span>
                          )}
                        </div>
                      </div>

                      {cr.year && (
                        <div className="text-[9px] text-[var(--text-muted)] mt-1.5 font-semibold flex items-center justify-between w-full">
                          <span>{cr.year} · {cr.type === 'tv' ? 'Series' : 'Movie'}</span>
                          <span className="text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold">Preview →</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer Minimal Indicator */}
      <footer className="py-5 text-center text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)] px-4">
        <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto">
          <span>EHSAAN PLAY · Cast & Crew Profile</span>
        </div>
      </footer>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
