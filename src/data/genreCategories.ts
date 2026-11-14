import { GenreCategoryItem } from '../types/movie';

export const GENRE_CATEGORIES: GenreCategoryItem[] = [
  {
    id: 'thriller',
    name: 'Thriller',
    subtitle: 'High-stakes suspense & pulse-pounding tension',
    tagline: 'Edge of your seat masterworks',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8M1A928y8T8x.jpg', // Inception
    accentColor: '#E11D48',
    iconName: 'Flame',
  },
  {
    id: 'psychological-thriller',
    name: 'Psychological Thriller',
    subtitle: 'Mind games, paranoia & twisted reality',
    tagline: 'Stories that unravel the human psyche',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/p1A3iO445cR9aGjK0uCqJ4k19Pq.jpg', // Silence of the Lambs
    accentColor: '#9333EA',
    iconName: 'Brain',
  },
  {
    id: 'mystery',
    name: 'Mystery',
    subtitle: 'Puzzling crimes, detective enigmas & clues',
    tagline: 'Untangle the truth before the final twist',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/t5zCBSB5xMOMlXIC0v799yA01.jpg', // Severance
    accentColor: '#2563EB',
    iconName: 'Search',
  },
  {
    id: 'crime',
    name: 'Crime',
    subtitle: 'Underworld syndicates, heists & investigations',
    tagline: 'Morally complex stories of law and outlaw',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/tsRy63MuZvR8B3BB.jpg', // Breaking Bad
    accentColor: '#D97706',
    iconName: 'ShieldAlert',
  },
  {
    id: 'action',
    name: 'Action',
    subtitle: 'Kinetic choreography, stunts & adrenaline',
    tagline: 'Visceral spectacles of speed and spectacle',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg', // The Dark Knight
    accentColor: '#EA580C',
    iconName: 'Zap',
  },
  {
    id: 'sci-fi',
    name: 'Science Fiction',
    subtitle: 'Space odysseys, futures & speculative worlds',
    tagline: 'Expanding the horizons of human imagination',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljv3PAtM81RSp29R2i4E.jpg', // Interstellar
    accentColor: '#06B6D4',
    iconName: 'Rocket',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    subtitle: 'Mythic realms, ancient magic & legends',
    tagline: 'Epic journeys across uncharted worlds',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/2OMG0YGEq2FWMucA8gB1s.jpg', // Game of Thrones
    accentColor: '#8B5CF6',
    iconName: 'Sparkles',
  },
  {
    id: 'horror',
    name: 'Horror',
    subtitle: 'Dread, nightmares & paranormal terror',
    tagline: 'Cinematic encounters with the unknown',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/56v2Kj2RNRMevMszVRAxGlKzIOn.jpg', // Stranger Things
    accentColor: '#DC2626',
    iconName: 'Ghost',
  },
  {
    id: 'romance',
    name: 'Romance',
    subtitle: 'Passionate connections, heartbreak & intimacy',
    tagline: 'Timeless love stories and modern bonds',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/vL5WbWWP2m3F2RkFiAtmPqpDUt7.jpg', // Avatar
    accentColor: '#F43F5E',
    iconName: 'Heart',
  },
  {
    id: 'drama',
    name: 'Drama',
    subtitle: 'Profound human stories & powerful emotional depth',
    tagline: 'Gripping narratives mirroring real life',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', // Shawshank
    accentColor: '#4F46E5',
    iconName: 'Film',
  },
  {
    id: 'comedy',
    name: 'Comedy',
    subtitle: 'Sharp wit, absurd situations & laugh-out-loud joy',
    tagline: 'Brilliant satire, sketches & comedic brilliance',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/mAMbvvWpM1qA09zN712.jpg', // The Bear
    accentColor: '#10B981',
    iconName: 'Smile',
  },
  {
    id: 'adventure',
    name: 'Adventure',
    subtitle: 'Expeditions into the wild & uncharted voyages',
    tagline: 'Daring quests and heroic journeys',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520FFq.jpg', // Dune 2
    accentColor: '#14B8A6',
    iconName: 'Compass',
  },
  {
    id: 'animation',
    name: 'Animation',
    subtitle: 'Visual masterpieces & boundary-pushing craft',
    tagline: 'Artistry in motion across every genre',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/fqv8v6AycXKsivp1TddowoqPRht.jpg', // Arcane
    accentColor: '#F59E0B',
    iconName: 'Palette',
  },
  {
    id: 'documentary',
    name: 'Documentary',
    subtitle: 'True stories, investigative journalism & natural history',
    tagline: 'Unvarnished truth and deep human insights',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/uL6Ad12Fe4Kh3LQ8R5k4a2.jpg', // Chernobyl
    accentColor: '#059669',
    iconName: 'Video',
  },
  {
    id: 'historical',
    name: 'Historical',
    subtitle: 'Period epics, pivotal eras & true chronicles',
    tagline: 'Bringing world-changing moments to life',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/tQ0Z4b4mQ16x9rP08d9s2010.jpg', // Shogun
    accentColor: '#B45309',
    iconName: 'Landmark',
  },
  {
    id: 'supernatural',
    name: 'Supernatural',
    subtitle: 'Ghosts, otherworldly phenomena & arcane mysteries',
    tagline: 'When the impossible intrudes on ordinary reality',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg', // Oppenheimer
    accentColor: '#7C3AED',
    iconName: 'Moon',
  },
  {
    id: 'war',
    name: 'War',
    subtitle: 'Frontline courage, tragedy & tactical battles',
    tagline: 'Harrowing accounts of conflict and brotherhood',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/AaV1YIdWKnjA2ex59L2aStccZ2e.jpg', // Top Gun
    accentColor: '#991B1B',
    iconName: 'Flag',
  },
  {
    id: 'survival',
    name: 'Survival',
    subtitle: 'Man vs nature, extreme endurance & isolation',
    tagline: 'The primal will to live against all odds',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg', // The Last of Us
    accentColor: '#65A30D',
    iconName: 'Mountain',
  },
  {
    id: 'dark-comedy',
    name: 'Dark Comedy',
    subtitle: 'Morbid humor, cynicism & uncomfortable laughs',
    tagline: 'Laughing at the darkest sides of human nature',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', // Pulp Fiction
    accentColor: '#047857',
    iconName: 'Skull',
  },
  {
    id: 'anime',
    name: 'Anime',
    subtitle: 'Acclaimed Japanese animation & visionary storytelling',
    tagline: 'Genre-defining series and landmark films',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/7d6o006rS2bA8pD7p9f5W1A09.jpg', // Spider-Verse / Anime aesthetic
    accentColor: '#EC4899',
    iconName: 'Tv',
  },
];
