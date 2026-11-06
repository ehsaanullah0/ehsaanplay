/**
 * Direct Landing URL Generator for Streaming Providers
 * 
 * Takes a provider name (e.g., Netflix, Prime Video, Disney+, Apple TV+, etc.)
 * along with the media title, type, and optional year, and constructs a direct landing URL
 * so users can jump straight to the title on that platform without manual searching.
 */

import { MediaType } from '../types/movie';

export interface DirectStreamingPlatform {
  name: string;
  url: string;
  displayName: string;
  isDirectSearch: boolean;
}

/**
 * Resolves the direct title landing URL for any streaming platform.
 */
export function getStreamingDirectLandingUrl(
  providerName: string,
  title: string,
  type: MediaType = 'movie',
  year?: number
): string {
  if (!providerName || !title) return '';

  const cleanTitle = title.trim();
  const encodedTitle = encodeURIComponent(cleanTitle);
  const lower = providerName.toLowerCase();

  // Netflix
  if (lower.includes('netflix')) {
    return `https://www.netflix.com/search?q=${encodedTitle}`;
  }

  // Amazon Prime Video / Amazon Video
  if (lower.includes('prime') || lower.includes('amazon')) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`;
  }

  // Disney+ / Disney Plus
  if (lower.includes('disney')) {
    return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  }

  // Apple TV+ / Apple TV / Apple iTunes
  if (lower.includes('apple') || lower.includes('itunes')) {
    return `https://tv.apple.com/search?term=${encodedTitle}`;
  }

  // Max / HBO Max / HBO
  if (lower.includes('max') || lower.includes('hbo')) {
    return `https://play.max.com/search?q=${encodedTitle}`;
  }

  // Hulu
  if (lower.includes('hulu')) {
    return `https://www.hulu.com/search?q=${encodedTitle}`;
  }

  // Paramount+ / Paramount Plus
  if (lower.includes('paramount')) {
    return `https://www.paramountplus.com/search/?query=${encodedTitle}`;
  }

  // Peacock / Peacock Premium
  if (lower.includes('peacock')) {
    return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  }

  // YouTube / YouTube Premium / YouTube Movies
  if (lower.includes('youtube')) {
    const term = type === 'tv' ? `${cleanTitle} full episodes` : `${cleanTitle} movie`;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`;
  }

  // Google Play Movies / Google TV
  if (lower.includes('google')) {
    return `https://play.google.com/store/search?q=${encodedTitle}&c=movies`;
  }

  // Crunchyroll
  if (lower.includes('crunchyroll')) {
    return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  }

  // Tubi / Tubi TV
  if (lower.includes('tubi')) {
    return `https://tubitv.com/search/${encodedTitle}`;
  }

  // Pluto TV
  if (lower.includes('pluto')) {
    return `https://pluto.tv/en/search/details?q=${encodedTitle}`;
  }

  // Vudu / Fandango at Home
  if (lower.includes('vudu') || lower.includes('fandango')) {
    return `https://www.vudu.com/content/movies/search?searchString=${encodedTitle}`;
  }

  // Criterion Channel
  if (lower.includes('criterion')) {
    return `https://www.criterionchannel.com/search?q=${encodedTitle}`;
  }

  // Disney+ Hotstar / Hotstar
  if (lower.includes('hotstar')) {
    return `https://www.hotstar.com/in/explore?search_query=${encodedTitle}`;
  }

  // JioCinema
  if (lower.includes('jio')) {
    return `https://www.jiocinema.com/search/${encodedTitle}`;
  }

  // SonyLIV / Sony LIV
  if (lower.includes('sonyliv') || lower.includes('sony')) {
    return `https://www.sonyliv.com/search?query=${encodedTitle}`;
  }

  // Zee5
  if (lower.includes('zee')) {
    return `https://www.zee5.com/search?q=${encodedTitle}`;
  }

  // Discovery+
  if (lower.includes('discovery')) {
    return `https://www.discoveryplus.com/search?q=${encodedTitle}`;
  }

  // BBC iPlayer
  if (lower.includes('iplayer') || lower.includes('bbc')) {
    return `https://www.bbc.co.uk/iplayer/search?q=${encodedTitle}`;
  }

  // ITVX
  if (lower.includes('itvx') || lower.includes('itv')) {
    return `https://www.itv.com/search?q=${encodedTitle}`;
  }

  // MUBI
  if (lower.includes('mubi')) {
    return `https://mubi.com/search?query=${encodedTitle}`;
  }

  // Rakuten TV
  if (lower.includes('rakuten')) {
    return `https://rakuten.tv/search?q=${encodedTitle}`;
  }

  // Plex
  if (lower.includes('plex')) {
    return `https://app.plex.tv/desktop/#!/search?query=${encodedTitle}`;
  }

  // Kanopy
  if (lower.includes('kanopy')) {
    return `https://www.kanopy.com/en/search?query=${encodedTitle}`;
  }

  // Hoopla
  if (lower.includes('hoopla')) {
    return `https://www.hoopladigital.com/search?q=${encodedTitle}`;
  }

  // Shudder
  if (lower.includes('shudder')) {
    return `https://www.shudder.com/search?q=${encodedTitle}`;
  }

  // BritBox
  if (lower.includes('britbox')) {
    return `https://www.britbox.com/search?q=${encodedTitle}`;
  }

  // Starz
  if (lower.includes('starz')) {
    return `https://www.starz.com/us/en/search?q=${encodedTitle}`;
  }

  // AMC+ / AMC
  if (lower.includes('amc')) {
    return `https://www.amcplus.com/search?q=${encodedTitle}`;
  }

  // MGM+
  if (lower.includes('mgm')) {
    return `https://www.mgmplus.com/search?q=${encodedTitle}`;
  }

  // Crave
  if (lower.includes('crave')) {
    return `https://www.crave.ca/en/search?q=${encodedTitle}`;
  }

  // Stan
  if (lower.includes('stan')) {
    return `https://www.stan.com.au/search?q=${encodedTitle}`;
  }

  // Now / Now TV
  if (lower.includes('now')) {
    return `https://www.nowtv.com/search?q=${encodedTitle}`;
  }

  // Universal Fallback: Google search targeted to the provider and title
  const query = `watch "${cleanTitle}" on ${providerName}${year ? ` (${year})` : ''}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Safely opens a streaming direct landing URL in a new tab
 */
export function openStreamingPlatform(
  providerName: string,
  title: string,
  type: MediaType = 'movie',
  year?: number
): void {
  const directUrl = getStreamingDirectLandingUrl(providerName, title, type, year);
  if (directUrl && typeof window !== 'undefined') {
    window.open(directUrl, '_blank', 'noopener,noreferrer');
  }
}
