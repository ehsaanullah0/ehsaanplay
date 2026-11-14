import { MediaItem } from '../types/movie';
import { fetchTMDBTrending, fetchTMDBLatestTrendingCatalog, testTMDBConnection, searchTMDB } from '../services/tmdb';
import { fetchOMDBLatestTrendingCatalog } from '../services/omdb';

export const KNOWN_TV_SHOWS_METADATA: Record<string, { seasonsCount: number; episodesCount: number; seasons?: any[] }> = {
  't-1396': { seasonsCount: 5, episodesCount: 62, seasons: [] },
  't-60625': { seasonsCount: 1, episodesCount: 5, seasons: [] },
  't-66732': { seasonsCount: 4, episodesCount: 34, seasons: [] },
  't-110492': { seasonsCount: 2, episodesCount: 16, seasons: [] },
};

export function getTVShowInitialMetadata(id: string | number): { seasonsCount: number; episodesCount: number; seasons?: any[] } | undefined {
  const key = String(id);
  return KNOWN_TV_SHOWS_METADATA[key] || { seasonsCount: 1, episodesCount: 10, seasons: [] };
}

export async function fetchNetflixTop10Movies(apiKey?: string): Promise<MediaItem[]> {
  try {
    const tmdbMovies = await fetchTMDBTrending('movie', 'week', apiKey);
    if (tmdbMovies && tmdbMovies.length > 0) {
      return tmdbMovies.slice(0, 10);
    }
  } catch (err) {
    console.warn('Falling back to curated top movies catalog:', err);
  }

  return [
    {
      id: 'm-inception',
      tmdbId: 27205,
      type: 'movie',
      title: 'Inception',
      originalTitle: 'Inception',
      releaseDate: '2010-07-16',
      year: 2010,
      overview: 'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLE1311o2R3B2S233KI1I828M.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8M1A928y8T8x.jpg',
      voteCount: 35000,
      tmdbRating: 8.4,
      genres: ['Action', 'Sci-Fi', 'Adventure'],
      cast: [{ name: 'Leonardo DiCaprio', character: 'Cobb' }],
      crew: [{ name: 'Christopher Nolan', job: 'Director' }],
      imdbId: 'tt1375666',
      imdbRating: 8.8,
      popularity: 95,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-interstellar',
      tmdbId: 157336,
      type: 'movie',
      title: 'Interstellar',
      originalTitle: 'Interstellar',
      releaseDate: '2014-11-07',
      year: 2014,
      overview: 'When Earth becomes uninhabitable, a team of explorers travels through a wormhole in space in an attempt to ensure humanity\'s survival.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljv3PAtM81RSp29R2i4E.jpg',
      voteCount: 33000,
      tmdbRating: 8.4,
      genres: ['Adventure', 'Drama', 'Sci-Fi'],
      cast: [{ name: 'Matthew McConaughey', character: 'Cooper' }],
      crew: [{ name: 'Christopher Nolan', job: 'Director' }],
      imdbId: 'tt0816692',
      imdbRating: 8.7,
      popularity: 92,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-dune-2',
      tmdbId: 693134,
      type: 'movie',
      title: 'Dune: Part Two',
      originalTitle: 'Dune: Part Two',
      releaseDate: '2024-03-01',
      year: 2024,
      overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLPoTGkESI8yL9hYLnGvftA.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520FFq.jpg',
      voteCount: 56000,
      tmdbRating: 8.5,
      genres: ['Sci-Fi', 'Adventure'],
      cast: [{ name: 'Timothée Chalamet', character: 'Paul Atreides' }],
      crew: [{ name: 'Denis Villeneuve', job: 'Director' }],
      imdbId: 'tt15239678',
      imdbRating: 8.6,
      popularity: 98,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-oppenheimer',
      tmdbId: 872585,
      type: 'movie',
      title: 'Oppenheimer',
      originalTitle: 'Oppenheimer',
      releaseDate: '2023-07-21',
      year: 2023,
      overview: 'The story of J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGvF8z1n2v.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
      voteCount: 22000,
      tmdbRating: 8.1,
      genres: ['Biography', 'Drama', 'History'],
      cast: [{ name: 'Cillian Murphy', character: 'J. Robert Oppenheimer' }],
      crew: [{ name: 'Christopher Nolan', job: 'Director' }],
      imdbId: 'tt15398776',
      imdbRating: 8.9,
      popularity: 94,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-dark-knight',
      tmdbId: 155,
      type: 'movie',
      title: 'The Dark Knight',
      originalTitle: 'The Dark Knight',
      releaseDate: '2008-07-18',
      year: 2008,
      overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
      voteCount: 32000,
      tmdbRating: 8.5,
      genres: ['Action', 'Crime', 'Drama'],
      cast: [{ name: 'Christian Bale', character: 'Bruce Wayne' }],
      crew: [{ name: 'Christopher Nolan', job: 'Director' }],
      imdbId: 'tt0468569',
      imdbRating: 9.0,
      popularity: 97,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-spider-verse',
      tmdbId: 569094,
      type: 'movie',
      title: 'Spider-Man: Across the Spider-Verse',
      originalTitle: 'Spider-Man: Across the Spider-Verse',
      releaseDate: '2023-06-02',
      year: 2023,
      overview: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj7sFm8.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/4nM2v8W49yioqNVRICGzNE1x3ee.jpg',
      voteCount: 18000,
      tmdbRating: 8.4,
      genres: ['Animation', 'Action', 'Adventure'],
      cast: [{ name: 'Shameik Moore', character: 'Miles Morales' }],
      crew: [{ name: 'Joaquim Dos Santos', job: 'Director' }],
      imdbId: 'tt9362722',
      imdbRating: 8.7,
      popularity: 91,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-avatar-2',
      tmdbId: 76600,
      type: 'movie',
      title: 'Avatar: The Way of Water',
      originalTitle: 'Avatar: The Way of Water',
      releaseDate: '2022-12-16',
      year: 2022,
      overview: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns, Jake must work with Neytiri.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/t6HIw3zPDfiYWUZifRiXtWvXif5.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/vL5WbWWP2m3F2RkFiAtmPqpDUt7.jpg',
      voteCount: 12000,
      tmdbRating: 7.7,
      genres: ['Sci-Fi', 'Action', 'Adventure'],
      cast: [{ name: 'Sam Worthington', character: 'Jake Sully' }],
      crew: [{ name: 'James Cameron', job: 'Director' }],
      imdbId: 'tt1630029',
      imdbRating: 7.6,
      popularity: 89,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-top-gun-maverick',
      tmdbId: 361743,
      type: 'movie',
      title: 'Top Gun: Maverick',
      originalTitle: 'Top Gun: Maverick',
      releaseDate: '2022-05-27',
      year: 2022,
      overview: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOPGUN\'s elite graduates.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/62HCp2122w12ioac2ZKgZOTavjq.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/AaV1YIdWKnjA2ex59L2aStccZ2e.jpg',
      voteCount: 8500,
      tmdbRating: 8.3,
      genres: ['Action', 'Drama'],
      cast: [{ name: 'Tom Cruise', character: 'Pete "Maverick" Mitchell' }],
      crew: [{ name: 'Joseph Kosinski', job: 'Director' }],
      imdbId: 'tt1745960',
      imdbRating: 8.3,
      popularity: 88,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-parasite',
      tmdbId: 496243,
      type: 'movie',
      title: 'Parasite',
      originalTitle: 'Gisaengchung',
      releaseDate: '2019-05-30',
      year: 2019,
      overview: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTqvZfyF1V3VJvjxpyUZm4Gko.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg',
      voteCount: 17800,
      tmdbRating: 8.5,
      genres: ['Drama', 'Thriller'],
      cast: [{ name: 'Song Kang-ho', character: 'Kim Ki-taek' }],
      crew: [{ name: 'Bong Joon Ho', job: 'Director' }],
      imdbId: 'tt6751668',
      imdbRating: 8.5,
      popularity: 87,
      metadataSource: 'tmdb',
    },
    {
      id: 'm-pulp-fiction',
      tmdbId: 680,
      type: 'movie',
      title: 'Pulp Fiction',
      originalTitle: 'Pulp Fiction',
      releaseDate: '1994-10-14',
      year: 1994,
      overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
      voteCount: 27000,
      tmdbRating: 8.5,
      genres: ['Crime', 'Drama'],
      cast: [{ name: 'John Travolta', character: 'Vincent Vega' }],
      crew: [{ name: 'Quentin Tarantino', job: 'Director' }],
      imdbId: 'tt0110912',
      imdbRating: 8.9,
      popularity: 90,
      metadataSource: 'tmdb',
    },
  ];
}

export async function fetchNetflixTop10Series(apiKey?: string): Promise<MediaItem[]> {
  try {
    const tmdbSeries = await fetchTMDBTrending('tv', 'week', apiKey);
    if (tmdbSeries && tmdbSeries.length > 0) {
      return tmdbSeries.slice(0, 10);
    }
  } catch (err) {
    console.warn('Falling back to curated top series catalog:', err);
  }

  return [
    {
      id: 't-breaking-bad',
      tmdbId: 1396,
      type: 'tv',
      title: 'Breaking Bad',
      originalTitle: 'Breaking Bad',
      releaseDate: '2008-01-20',
      year: 2008,
      overview: 'A chemistry teacher turns to manufacturing methamphetamine to secure his family\'s future.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/zte3sB3pQ86u53p9e5i1.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/tsRy63MuZvR8B3BB.jpg',
      voteCount: 13000,
      tmdbRating: 8.9,
      genres: ['Crime', 'Drama', 'Thriller'],
      seasonsCount: 5,
      episodesCount: 62,
      cast: [{ name: 'Bryan Cranston', character: 'Walter White' }],
      crew: [{ name: 'Vince Gilligan', job: 'Creator' }],
      imdbId: 'tt0903747',
      imdbRating: 9.5,
      popularity: 99,
      metadataSource: 'tmdb',
    },
    {
      id: 't-shogun',
      tmdbId: 126308,
      type: 'tv',
      title: 'Shōgun',
      originalTitle: 'Shōgun',
      releaseDate: '2024-02-27',
      year: 2024,
      overview: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/7O4nLZR90W3y25TmresSMW2s6Wq.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/tQ0Z4b4mQ16x9rP08d9s2010.jpg',
      voteCount: 1400,
      tmdbRating: 8.5,
      genres: ['Drama', 'History', 'Action'],
      seasonsCount: 1,
      episodesCount: 10,
      cast: [{ name: 'Hiroyuki Sanada', character: 'Toranaga' }],
      crew: [{ name: 'Rachel Kondo', job: 'Creator' }],
      imdbId: 'tt2788316',
      imdbRating: 8.7,
      popularity: 97,
      metadataSource: 'tmdb',
    },
    {
      id: 't-arcane',
      tmdbId: 94605,
      type: 'tv',
      title: 'Arcane',
      originalTitle: 'Arcane',
      releaseDate: '2021-11-06',
      year: 2021,
      overview: 'Set in Piltover and Zaun, the story follows the origins of two iconic League champions.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/fqv8v6AycXKsivp1TddowoqPRht.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/fqv8v6AycXKsivp1TddowoqPRht.jpg',
      voteCount: 3800,
      tmdbRating: 8.7,
      genres: ['Animation', 'Sci-Fi', 'Action'],
      seasonsCount: 2,
      episodesCount: 18,
      cast: [{ name: 'Hailee Steinfeld', character: 'Vi' }],
      crew: [{ name: 'Christian Linke', job: 'Creator' }],
      imdbId: 'tt11126994',
      imdbRating: 9.0,
      popularity: 96,
      metadataSource: 'tmdb',
    },
    {
      id: 't-severance',
      tmdbId: 95557,
      type: 'tv',
      title: 'Severance',
      originalTitle: 'Severance',
      releaseDate: '2022-02-18',
      year: 2022,
      overview: 'Mark leads a team of office workers whose memories have been surgically divided between work and personal lives.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/n3FfO2qEepZ7g5jB74mO051v2J8.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/t5zCBSB5xMOMlXIC0v799yA01.jpg',
      voteCount: 1900,
      tmdbRating: 8.4,
      genres: ['Drama', 'Mystery', 'Sci-Fi'],
      seasonsCount: 2,
      episodesCount: 19,
      cast: [{ name: 'Adam Scott', character: 'Mark' }],
      crew: [{ name: 'Dan Erickson', job: 'Creator' }],
      imdbId: 'tt11280740',
      imdbRating: 8.7,
      popularity: 95,
      metadataSource: 'tmdb',
    },
    {
      id: 't-the-last-of-us',
      tmdbId: 100088,
      type: 'tv',
      title: 'The Last of Us',
      originalTitle: 'The Last of Us',
      releaseDate: '2023-01-15',
      year: 2023,
      overview: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity\'s last hope.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
      voteCount: 4800,
      tmdbRating: 8.6,
      genres: ['Action', 'Adventure', 'Drama'],
      seasonsCount: 1,
      episodesCount: 9,
      cast: [{ name: 'Pedro Pascal', character: 'Joel' }],
      crew: [{ name: 'Craig Mazin', job: 'Creator' }],
      imdbId: 'tt3581920',
      imdbRating: 8.7,
      popularity: 94,
      metadataSource: 'tmdb',
    },
    {
      id: 't-succession',
      tmdbId: 76331,
      type: 'tv',
      title: 'Succession',
      originalTitle: 'Succession',
      releaseDate: '2018-06-03',
      year: 2018,
      overview: 'The Roy family is known for controlling the biggest media and entertainment company in the world.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/77m31Zz8S5d0oR1b92i0.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/qtfMr08KOGWXvox9v901.jpg',
      voteCount: 1500,
      tmdbRating: 8.3,
      genres: ['Drama'],
      seasonsCount: 4,
      episodesCount: 39,
      cast: [{ name: 'Brian Cox', character: 'Logan Roy' }],
      crew: [{ name: 'Jesse Armstrong', job: 'Creator' }],
      imdbId: 'tt7660850',
      imdbRating: 8.9,
      popularity: 92,
      metadataSource: 'tmdb',
    },
    {
      id: 't-the-bear',
      tmdbId: 125954,
      type: 'tv',
      title: 'The Bear',
      originalTitle: 'The Bear',
      releaseDate: '2022-06-23',
      year: 2022,
      overview: 'A young chef from the fine dining world comes home to Chicago to run his family Italian beef sandwich shop.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/1X45vR34T2y1oJ15.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/mAMbvvWpM1qA09zN712.jpg',
      voteCount: 1200,
      tmdbRating: 8.3,
      genres: ['Comedy', 'Drama'],
      seasonsCount: 3,
      episodesCount: 28,
      cast: [{ name: 'Jeremy Allen White', character: 'Carmy' }],
      crew: [{ name: 'Christopher Storer', job: 'Creator' }],
      imdbId: 'tt14452776',
      imdbRating: 8.6,
      popularity: 93,
      metadataSource: 'tmdb',
    },
    {
      id: 't-fallout',
      tmdbId: 106379,
      type: 'tv',
      title: 'Fallout',
      originalTitle: 'Fallout',
      releaseDate: '2024-04-10',
      year: 2024,
      overview: 'In a post-apocalyptic Los Angeles, citizens must live in underground bunkers to protect themselves from radiation.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/27K235s1.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/8mOU4nB9m2P02L8s0.jpg',
      voteCount: 1600,
      tmdbRating: 8.4,
      genres: ['Action', 'Adventure', 'Drama'],
      seasonsCount: 1,
      episodesCount: 8,
      cast: [{ name: 'Ella Purnell', character: 'Lucy' }],
      crew: [{ name: 'Geneva Robertson-Dworet', job: 'Creator' }],
      imdbId: 'tt12637874',
      imdbRating: 8.4,
      popularity: 96,
      metadataSource: 'tmdb',
    },
    {
      id: 't-stranger-things',
      tmdbId: 66732,
      type: 'tv',
      title: 'Stranger Things',
      originalTitle: 'Stranger Things',
      releaseDate: '2016-07-15',
      year: 2016,
      overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn88qbuYIOs.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/56v2Kj2RNRMevMszVRAxGlKzIOn.jpg',
      voteCount: 17000,
      tmdbRating: 8.6,
      genres: ['Sci-Fi', 'Horror', 'Drama'],
      seasonsCount: 4,
      episodesCount: 34,
      cast: [{ name: 'Millie Bobby Brown', character: 'Eleven' }],
      crew: [{ name: 'Duffer Brothers', job: 'Creators' }],
      imdbId: 'tt4574334',
      imdbRating: 8.7,
      popularity: 98,
      metadataSource: 'tmdb',
    },
    {
      id: 't-game-of-thrones',
      tmdbId: 1399,
      type: 'tv',
      title: 'Game of Thrones',
      originalTitle: 'Game of Thrones',
      releaseDate: '2011-04-17',
      year: 2011,
      overview: 'Seven noble families fight for control of the mythical land of Westeros, while an ancient enemy returns.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89vEDgZ1vjV8y.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/2OMG0YGEq2FWMucA8gB1s.jpg',
      voteCount: 23000,
      tmdbRating: 8.4,
      genres: ['Sci-Fi', 'Fantasy', 'Drama'],
      seasonsCount: 8,
      episodesCount: 73,
      cast: [{ name: 'Emilia Clarke', character: 'Daenerys Targaryen' }],
      crew: [{ name: 'David Benioff', job: 'Creator' }],
      imdbId: 'tt0944947',
      imdbRating: 9.2,
      popularity: 97,
      metadataSource: 'tmdb',
    },
  ];
}

export const CURATED_OMDB_RECOMMENDATIONS: MediaItem[] = [
  {
    "id": "tt33764258",
    "tmdbId": 1368337,
    "type": "movie",
    "title": "The Odyssey",
    "originalTitle": "The Odyssey",
    "releaseDate": "2026-07-15",
    "year": 2026,
    "overview": "Odysseus, the legendary King of Ithaca, embarks on a long and perilous journey home following the Trojan War. Throughout his voyage, he is forced to confront the whims of gods, mythological monsters, and trials that stretch both his cunning and his humanity to the breaking point.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/njbjSn2ihutJD1lNeM4jAmeDkG9.jpg",
    "voteCount": 544815,
    "tmdbRating": 8,
    "imdbRating": 8.4,
    "genres": [
      "Adventure",
      "Action",
      "Fantasy"
    ],
    "popularity": 453,
    "metadataSource": "omdb",
    "imdbId": "tt33764258",
    "cast": [
      {
        "name": "Matt Damon",
        "character": "Cast"
      },
      {
        "name": "Tom Holland",
        "character": "Cast"
      },
      {
        "name": "Anne Hathaway",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Christopher Nolan",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNTcyNmJlZmQtNDUwYy00NDBjLTg1NGQtYTY2Y2UxMWM3NmI1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 172
  },
  {
    "id": "tt32375763",
    "tmdbId": 254630,
    "type": "tv",
    "title": "12 12 12",
    "originalTitle": "12 12 12",
    "releaseDate": "2026-11-12",
    "year": 2026,
    "overview": "A heist takes 12 months to plan, 12 hours to execute—and a thief not caught within 12 days won't be caught at all. Across three pulse-pounding timelines, an FBI agent and a career criminal face off in a deadly game of cat and mouse through Europe.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/bG4h6C6wRKmf3ryz8gdN6imXW4c.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/6qCcXg7zXD3Xp5Whk8DwwFQNwAM.jpg",
    "voteCount": 4,
    "tmdbRating": 3.3,
    "imdbRating": 3.3,
    "genres": [
      "Action",
      "Crime",
      "Drama"
    ],
    "popularity": 14,
    "metadataSource": "omdb",
    "imdbId": "tt32375763",
    "cast": [
      {
        "name": "Anthony Mackie",
        "character": "Cast"
      },
      {
        "name": "Jamie Dornan",
        "character": "Cast"
      },
      {
        "name": "Julius Feldmeier",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BYTVlNjU3NTYtNjVmNi00OTA3LTk3NGQtNGI3ZGI2OTdlNzEwXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt23112594",
    "tmdbId": 213375,
    "type": "tv",
    "title": "VisionQuest",
    "originalTitle": "VisionQuest",
    "releaseDate": "2026-10-13",
    "year": 2026,
    "overview": "With a bounty on his head, Vision must confront his nature and resist Ultron's influence to survive.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/WGyAyBPncfuu8MZhLY9RtfZPM0.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/31o1Ufd7bStD5dGEcpzapOjwaqx.jpg",
    "voteCount": 14696,
    "tmdbRating": 8.4,
    "imdbRating": 7.8,
    "genres": [
      "Sci-Fi",
      "Drama"
    ],
    "popularity": 343,
    "metadataSource": "omdb",
    "imdbId": "tt23112594",
    "cast": [
      {
        "name": "Paul Bettany",
        "character": "Cast"
      },
      {
        "name": "James Spader",
        "character": "Cast"
      },
      {
        "name": "Ruaridh Mollica",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BY2FlNjIxMDktMGYyZi00NjY3LWI4YjctYTcxNzc2MDUwYjZmXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt13884466",
    "tmdbId": 1792170,
    "type": "movie",
    "title": "Model Citizen",
    "originalTitle": "Model Citizen",
    "releaseDate": "2026-11-03",
    "year": 2026,
    "overview": "With his memories gone and his past a blur, ex-cop Steven Bay seeks treatment for his amnesia while working on an isolated farm. Instead, he's met with rising hostility, strange surveillance, and instincts he can’t fully control. When the pressure becomes unbearable, Bay begins a desperate hunt for the truth behind his fractured reality.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/7SE0LBwgqiqZzkm9gKVbBAbcNQL.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/mC5Y5jmodmTp7T7eyQ8tTBnQRg5.jpg",
    "voteCount": 29,
    "tmdbRating": 6.4,
    "imdbRating": 6.4,
    "genres": [
      "Crime",
      "Sci-Fi",
      "Thriller"
    ],
    "popularity": 46,
    "metadataSource": "omdb",
    "imdbId": "tt13884466",
    "cast": [
      {
        "name": "Emmanuelle Chriqui",
        "character": "Cast"
      },
      {
        "name": "Aaron Eckhart",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMWVjM2Y0YWEtNTczZi00YjdlLWIxOGQtOGJhYzI4NzI1OTZhXkEyXkFqcGdeQWRpZWdtb25n._V1_QL75_UX1000_CR0,0,1000,563_.jpg",
    "runtime": 93,
    "crew": []
  },
  {
    "id": "tt36586020",
    "tmdbId": 1400837,
    "type": "movie",
    "title": "Other Mommy",
    "originalTitle": "Other Mommy",
    "releaseDate": "2026-10-07",
    "year": 2026,
    "overview": "Young Bela forms a relationship with a sinister entity in her home that looks uncannily like her own mother, drawing her into a terrifying and increasingly dark world.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/kNxRgcTeqeU5jauBackTERoO2De.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/ncm7djsVTHQQMX2HEbEVxMUFchG.jpg",
    "voteCount": 320,
    "tmdbRating": 6.1,
    "imdbRating": 6.1,
    "genres": [
      "Horror"
    ],
    "popularity": 253,
    "metadataSource": "omdb",
    "imdbId": "tt36586020",
    "cast": [
      {
        "name": "Jessica Chastain",
        "character": "Cast"
      },
      {
        "name": "Dichen Lachman",
        "character": "Cast"
      },
      {
        "name": "Karen Allen",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Rob Savage",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNWU2MzZlNmItYzVmYi00Y2Y4LWI4NTktNTg3NDE0MGE5NGRkXkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg",
    "runtime": 93
  },
  {
    "id": "tt7526136",
    "tmdbId": 1263337,
    "type": "movie",
    "title": "Heart of the Beast",
    "originalTitle": "Heart of the Beast",
    "releaseDate": "2026-09-19",
    "year": 2026,
    "overview": "After a harrowing plane crash, Special Forces officer James Belmont and his combat dog, Odin, find themselves stranded deep in the Alaskan wilderness. Together, they are forced into a brutal fight for survival against the elements.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/6uVRPFflyJpo8Cx872olmlGTWla.jpg",
    "voteCount": 542,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Adventure",
      "Thriller"
    ],
    "popularity": 559,
    "metadataSource": "omdb",
    "imdbId": "tt7526136",
    "cast": [
      {
        "name": "Brad Pitt",
        "character": "Cast"
      },
      {
        "name": "J.K. Simmons",
        "character": "Cast"
      },
      {
        "name": "Anna Lambe",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "David Ayer",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMDVlMTRhMjgtMjdmZi00NjJhLWExMmYtODExNWJkZGZjNjdhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 101
  },
  {
    "id": "tt35538033",
    "tmdbId": 1423191,
    "type": "movie",
    "title": "Resident Evil",
    "originalTitle": "Resident Evil",
    "releaseDate": "2026-09-16",
    "year": 2026,
    "overview": "Medical courier Bryan unwittingly finds himself fighting for survival as one fateful, horrifying night collapses around him in chaos.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/8R79AZjX1Bt4219Ub3CrRMsPQsW.jpg",
    "voteCount": 2106,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Horror",
      "Sci-Fi",
      "Adventure"
    ],
    "popularity": 587,
    "metadataSource": "omdb",
    "imdbId": "tt35538033",
    "cast": [
      {
        "name": "Austin Abrams",
        "character": "Cast"
      },
      {
        "name": "Paul Walter Hauser",
        "character": "Cast"
      },
      {
        "name": "Zach Cherry",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Zach Cregger",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BODIwYTk4MWYtMGUxYS00OWUzLTg5MDYtNzg5MmYyNzcyNThkXkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg",
    "runtime": 90
  },
  {
    "id": "tt21357150",
    "tmdbId": 1003596,
    "type": "movie",
    "title": "Avengers: Doomsday",
    "originalTitle": "Avengers: Doomsday",
    "releaseDate": "2026-12-16",
    "year": 2026,
    "overview": "Beloved heroes from three distinct universes are set on a deadly collision course and face an existential threat unlike anything they've ever encountered.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/tTMmREfhVd51CCg7GN73wL8cIoT.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/rObL4of4eFA8yWaN9pRFo9aOVNi.jpg",
    "voteCount": 0,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Sci-Fi",
      "Action",
      "Adventure"
    ],
    "popularity": 118,
    "metadataSource": "omdb",
    "imdbId": "tt21357150",
    "cast": [
      {
        "name": "Robert Downey Jr.",
        "character": "Cast"
      },
      {
        "name": "Pedro Pascal",
        "character": "Cast"
      },
      {
        "name": "Chris Hemsworth",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Anthony Russo",
        "job": "Director"
      },
      {
        "name": "Joe Russo",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMTdlMDgxNjAtNjkxOC00ZDYxLTg3MDEtZmIwZjIxOGMwYjVkXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 165
  },
  {
    "id": "tt34384661",
    "tmdbId": 1381071,
    "type": "movie",
    "title": "Godzilla Minus Zero",
    "originalTitle": "ゴジラ-0.0",
    "releaseDate": "2026-11-03",
    "year": 2026,
    "overview": "War reduced Japan to zero, and Godzilla plunged it into minus. Two years have passed since then, and the country has faced agonizing struggles to achieve recovery and finally reclaim its daily life. Just as humanity managed to cling to a hard-won peace, a new threat strikes, crushing hope in an instant. There is no third time. Everything ends here.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/hSmIJluOJmTWvJs4d7kHRxjc8s8.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/oqrYIDH4tvfEzPe1yqT4jzmAWHQ.jpg",
    "voteCount": 168,
    "tmdbRating": 7.8,
    "imdbRating": 7.8,
    "genres": [
      "Sci-Fi",
      "Horror",
      "Action"
    ],
    "popularity": 185,
    "metadataSource": "omdb",
    "imdbId": "tt34384661",
    "cast": [
      {
        "name": "Ryûnosuke Kamiki",
        "character": "Cast"
      },
      {
        "name": "Minami Hamabe",
        "character": "Cast"
      },
      {
        "name": "Miou Tanaka",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Takashi Yamazaki",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNWUyMDY0NWQtMjI2Zi00YjMwLTkwYmItZDk1MGI5MjEzODQxXkEyXkFqcGc@._V1_QL75_UY562_CR10,0,380,562_.jpg",
    "runtime": 119
  },
  {
    "id": "tt38773219",
    "tmdbId": 1567605,
    "type": "movie",
    "title": "Ebenezer",
    "originalTitle": "Ebenezer",
    "releaseDate": "2026-11-11",
    "year": 2026,
    "overview": "An elderly miser embarks on a supernatural journey after visits from the ghost of his former business partner and the Spirits of Christmas Past, Present, and Yet to Come force him to confront his past and fight for a second chance at happiness.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/6H2N59jJW1hZEzn2ZdrMvJw5vNI.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/bF6nvHAt2jU7PnkOI4cnaUF2DZn.jpg",
    "voteCount": 29,
    "tmdbRating": 7.7,
    "imdbRating": 7.7,
    "genres": [
      "Fantasy",
      "Comedy"
    ],
    "popularity": 88,
    "metadataSource": "omdb",
    "imdbId": "tt38773219",
    "cast": [
      {
        "name": "Johnny Depp",
        "character": "Cast"
      },
      {
        "name": "Sam Claflin",
        "character": "Cast"
      },
      {
        "name": "Daisy Ridley",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Ti West",
        "job": "Director"
      }
    ]
  },
  {
    "id": "tt31510819",
    "tmdbId": 247718,
    "type": "tv",
    "title": "MobLand",
    "originalTitle": "MobLand",
    "releaseDate": "2025-03-30",
    "year": 2025,
    "overview": "Two mob families clash in a war that threatens to topple empires and lives.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/5Xc7WpWsgflfgEMoBlf9TmWhfbH.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/h0OC7ouop8YLwbAVfS3UUE2Lw4T.jpg",
    "voteCount": 131558,
    "tmdbRating": 8.6,
    "imdbRating": 8.3,
    "genres": [
      "Crime",
      "Drama"
    ],
    "popularity": 360,
    "metadataSource": "omdb",
    "imdbId": "tt31510819",
    "cast": [
      {
        "name": "Tom Hardy",
        "character": "Cast"
      },
      {
        "name": "Pierce Brosnan",
        "character": "Cast"
      },
      {
        "name": "Paddy Considine",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BZDc4MmYxNTAtM2ViYy00YWQ4LThjZWUtNDZjNTZjNDFhNzBjXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt39370926",
    "tmdbId": 1616687,
    "type": "movie",
    "title": "Never Surrender",
    "originalTitle": "Serangan Balik",
    "releaseDate": "2026-11-12",
    "year": 2026,
    "overview": "An ex-soldier and his grandchildren battle against ruthless criminals in a remote village. To survive, they must also confront their fears and regrets.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/hKROmLddpzpjkxKKVFYFRAOXX1b.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/umxN2kMcUm6VoxSOdcEcQoXuC4q.jpg",
    "voteCount": 7,
    "tmdbRating": 7.9,
    "imdbRating": 7.9,
    "genres": [
      "Action",
      "Crime",
      "Thriller"
    ],
    "popularity": 78,
    "metadataSource": "omdb",
    "imdbId": "tt39370926",
    "cast": [
      {
        "name": "Lukman Sardi",
        "character": "Cast"
      },
      {
        "name": "Derby Romero",
        "character": "Cast"
      },
      {
        "name": "Donny Alamsyah",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Sidharta Tata",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BY2I2MDE0MTctODA5Ni00YzJhLTgyNDMtZTdiNjcyMzU4YjUwXkEyXkFqcGc@._V1_SX300.jpg"
  },
  {
    "id": "tt37803364",
    "tmdbId": 1483525,
    "type": "movie",
    "title": "Possible Love",
    "originalTitle": "가능한 사랑",
    "releaseDate": "2026-09-23",
    "year": 2026,
    "overview": "A laid-off worker and his wife cross paths with a documentary filmmaker and her spouse and confront their hidden desires.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/1ERGPNiKtnEcsvJS1ywsmqmcIDO.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/k0BY5D4Ya6NHhsvNYMmaabpvUtS.jpg",
    "voteCount": 23,
    "tmdbRating": 7.6,
    "imdbRating": 7.7,
    "genres": [
      "Drama"
    ],
    "popularity": 52,
    "metadataSource": "omdb",
    "imdbId": "tt37803364",
    "cast": [
      {
        "name": "Jeon Do-yeon",
        "character": "Cast"
      },
      {
        "name": "Sul Kyung-gu",
        "character": "Cast"
      },
      {
        "name": "Zo In-sung",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Lee Chang-dong",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMTk4NjU5NjQtZjQxOS00OGIwLThhM2MtYWU1OTc4Y2M4NGVmXkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg",
    "runtime": 164
  },
  {
    "id": "tt31842126",
    "tmdbId": 249565,
    "type": "tv",
    "title": "The Good Daughter",
    "originalTitle": "The Good Daughter",
    "releaseDate": "2026-11-12",
    "year": 2026,
    "overview": "Sisters Charlotte and Samantha Quinn have spent the last twenty-eight years trying to piece together the lives that were fractured by a single night of violence. When another attack splinters the small town of Pikeville, Charlotte is the first witness on the scene. Now a lawyer like her father, she’s forced to confront her own demons as the case twists through one shocking revelation after another. In the end, both she and Samantha find themselves wondering if the price of being the good daughter was worth it after all.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/qJPvyo9Pxz3MQndd3tKSocLz1Nt.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/nDU6mUk4wVU1EkDkDvcLvT2UWdy.jpg",
    "voteCount": 6,
    "tmdbRating": 9.7,
    "imdbRating": 9.7,
    "genres": [
      "Drama",
      "Mystery"
    ],
    "popularity": 29,
    "metadataSource": "omdb",
    "imdbId": "tt31842126",
    "cast": [
      {
        "name": "Meghann Fahy",
        "character": "Cast"
      },
      {
        "name": "Rose Byrne",
        "character": "Cast"
      },
      {
        "name": "Audrey Grace Marshall",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BOWEwZThmZGEtNDBlYy00NWY4LTg5YzItM2Y0ZTcwOWYxODViXkEyXkFqcGc@._V1_QL75_UX280_CR0,0,280,280_.jpg",
    "crew": []
  },
  {
    "id": "tt39325975",
    "tmdbId": 279246,
    "type": "tv",
    "title": "The Remarried Empress",
    "originalTitle": "재혼 황후",
    "releaseDate": "2026-11-03",
    "year": 2026,
    "overview": "Beloved Empress Navier rules the Eastern Empire alongside Emperor Sovieshu. But when Sovieshu falls for a runaway slave and demands a divorce, Navier will agree on one condition: that she's given approval to remarry rival Prince Heinrey of the Western Kingdom.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/zn3IXZzGavH3qle3o3g1r32eXDy.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/fNcpHmuZLKoyhNMBEzdqzX8iIvg.jpg",
    "voteCount": 73,
    "tmdbRating": 8.2,
    "imdbRating": 8.2,
    "genres": [
      "Drama",
      "Sci-Fi"
    ],
    "popularity": 246,
    "metadataSource": "omdb",
    "imdbId": "tt39325975",
    "cast": [
      {
        "name": "Shin Min-a",
        "character": "Cast"
      },
      {
        "name": "Mitch Craig",
        "character": "Cast"
      },
      {
        "name": "Lee Jong-suk",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNTAxNjRhOTktY2RiMS00MzA2LTk3NjAtMzkxMTYwMzBlMDFhXkEyXkFqcGc@._V1_SX300.jpg",
    "crew": []
  },
  {
    "id": "tt32558705",
    "tmdbId": 1300968,
    "type": "movie",
    "title": "The Hunger Games: Sunrise on the Reaping",
    "originalTitle": "The Hunger Games: Sunrise on the Reaping",
    "releaseDate": "2026-11-18",
    "year": 2026,
    "overview": "Return to the world of Panem 24 years before the events of The Hunger Games, starting on the morning of the reaping of the 50th Hunger Games, also known as the Second Quarter Quell.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/j1MNyNNgNQL6f27cb3m3uKaPKd6.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/aqFZcr2dxSZ2UwWSo1WC6C0rwDf.jpg",
    "voteCount": 1,
    "tmdbRating": 10,
    "imdbRating": 10,
    "genres": [
      "Sci-Fi",
      "Action",
      "Adventure"
    ],
    "popularity": 52,
    "metadataSource": "omdb",
    "imdbId": "tt32558705",
    "cast": [
      {
        "name": "Joseph Zada",
        "character": "Cast"
      },
      {
        "name": "Elle Fanning",
        "character": "Cast"
      },
      {
        "name": "Mckenna Grace",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Francis Lawrence",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNGRkYmM2MjUtZTY4Yi00YTNhLTk1MDEtYTQ3YjFiOTljM2Y1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 150
  },
  {
    "id": "tt22084616",
    "tmdbId": 969681,
    "type": "movie",
    "title": "Spider-Man: Brand New Day",
    "originalTitle": "Spider-Man: Brand New Day",
    "releaseDate": "2026-07-29",
    "year": 2026,
    "overview": "Fighting crime full-time as Spider-Man in a world that doesn't remember him—and the pressure of seeing his old friends move on without him—sparks a change in Peter Parker he may not have the power to control. But that transformation might also be the only thing that can stop a shocking new threat to the city and those he loves - a powerful villain no one can even see.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/subj7knTn4DeS6KS7qI66EQKe9i.jpg",
    "voteCount": 327986,
    "tmdbRating": 8.5,
    "imdbRating": 8,
    "genres": [
      "Sci-Fi",
      "Action",
      "Adventure"
    ],
    "popularity": 344,
    "metadataSource": "omdb",
    "imdbId": "tt22084616",
    "cast": [
      {
        "name": "Tom Holland",
        "character": "Cast"
      },
      {
        "name": "Zendaya",
        "character": "Cast"
      },
      {
        "name": "Mark Ruffalo",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Destin Daniel Cretton",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BOWNjYWM3NWItOGE0ZS00MWRjLThiZWEtYjc4ZmNmMmU5ZTVmXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 145
  },
  {
    "id": "tt8014982",
    "tmdbId": 291507,
    "type": "tv",
    "title": "The Body",
    "originalTitle": "The Body",
    "releaseDate": "2026-11-11",
    "year": 2026,
    "overview": "On Halloween night, an all-girls dance squad tumbles into Catholic guilt, unholy desires and ghostly visions when an initiation goes to hell.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/195kCuy2RqGaEAZDDpGTx7gBUBZ.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/hYJqUoXRZnodGxgVZTM8uwr5kbC.jpg",
    "voteCount": 20,
    "tmdbRating": 6.9,
    "imdbRating": 6.9,
    "genres": [
      "Drama",
      "Mystery"
    ],
    "popularity": 96,
    "metadataSource": "omdb",
    "imdbId": "tt8014982",
    "cast": [
      {
        "name": "Sara Boustany",
        "character": "Cast"
      },
      {
        "name": "Bella Neuspiel",
        "character": "Cast"
      },
      {
        "name": "Al Sapienza",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMGYwYTUyNWUtYWI2MS00YmRlLThlZDAtNGZhZjdiYmE1ZTgyXkEyXkFqcGc@._V1_QL75_UY562_CR275,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tmdb-movie-656908",
    "tmdbId": 656908,
    "type": "movie",
    "title": "Ramayana: Rise of a Legend",
    "originalTitle": "रामायणम्",
    "releaseDate": "2026-11-05",
    "year": 2026,
    "overview": "An ancient epic follows a young prince and princess whose marriage and subsequent exile mark the beginning of a legendary journey. Their story of love, duty and destiny sets the stage for greater challenges ahead.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/vBQ7wks68OhJKlb3RnXSl2yXBXK.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/yHVZncPRZr63mezRX20IyKLrSkv.jpg",
    "voteCount": 41,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Fantasy",
      "Action",
      "Adventure"
    ],
    "popularity": 161,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tt34206385",
    "tmdbId": 1375441,
    "type": "movie",
    "title": "Primetime",
    "originalTitle": "Primetime",
    "releaseDate": "2026-09-23",
    "year": 2026,
    "overview": "In 2006, To Catch a Predator host Chris Hansen sets out to make television history. When a high stakes operation goes fatally wrong, his veneered dream of fame curdles into a nightmare of performative justice.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/lmrulvLbmaejTix1YaMxo1oGhH1.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/sEsMwSDUWGIx9EfNxzM6KzVSsSQ.jpg",
    "voteCount": 31970,
    "tmdbRating": 6.8,
    "imdbRating": 7,
    "genres": [
      "Thriller",
      "Drama",
      "Crime"
    ],
    "popularity": 64,
    "metadataSource": "omdb",
    "imdbId": "tt34206385",
    "cast": [
      {
        "name": "Robert Pattinson",
        "character": "Cast"
      },
      {
        "name": "Merritt Wever",
        "character": "Cast"
      },
      {
        "name": "Skyler Gisondo",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Lance Oppenheim",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMTcyZGI2NWQtOTU3NS00NTEyLTliNDItNTQyNmFkMGZmZGQzXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 109
  },
  {
    "id": "tt15095848",
    "tmdbId": 1050981,
    "type": "movie",
    "title": "Being Heumann",
    "originalTitle": "Being Heumann",
    "releaseDate": "2026-11-06",
    "year": 2026,
    "overview": "Scrappy, defiant, and done being treated like a burden, Judy Heumann turns her outrage into a revolution. In 1977, she and more than 100 disability rights protestors send a very loud message: The system is broken—not us.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/ouGH1PS0xjDyfTQOhppn7QzJqQZ.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/25aB8RXP4mfQLFRSuEEhk0d0sTC.jpg",
    "voteCount": 2,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Drama",
      "History"
    ],
    "popularity": 5,
    "metadataSource": "omdb",
    "imdbId": "tt15095848",
    "cast": [
      {
        "name": "Lindsay Leese",
        "character": "Cast"
      },
      {
        "name": "Mark Ruffalo",
        "character": "Cast"
      },
      {
        "name": "Dylan O&apos;Brien",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Sian Heder",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNDk0YjMxYjUtNTE4YS00NjEyLThjYTItMWVhY2NjZjk1NmJmXkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg",
    "runtime": 127
  },
  {
    "id": "tt33043892",
    "tmdbId": 259909,
    "type": "tv",
    "title": "Dexter: Resurrection",
    "originalTitle": "Dexter: Resurrection",
    "releaseDate": "2025-07-13",
    "year": 2025,
    "overview": "Set 10 weeks after Dexter: New Blood, Dexter Morgan chases a missing Harrison to New York City, where Captain Angel Batista is hot on their trail from way down in Miami.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/o2Oyi3boT100bY5kCP4MBiTeetO.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/vcpj6rRDS93ImHCLPY8bwBuFGjR.jpg",
    "voteCount": 163193,
    "tmdbRating": 8.6,
    "imdbRating": 9,
    "genres": [
      "Crime",
      "Drama",
      "Mystery"
    ],
    "popularity": 86,
    "metadataSource": "omdb",
    "imdbId": "tt33043892",
    "cast": [
      {
        "name": "Michael C. Hall",
        "character": "Cast"
      },
      {
        "name": "Uma Thurman",
        "character": "Cast"
      },
      {
        "name": "Ntare Guma Mbaho Mwine",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMWFmZDE2OTktOWY1Yi00ZTBiLWE3NWUtMzdmNTM1ZmQ0ZGQzXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt13611778",
    "tmdbId": 1294189,
    "type": "movie",
    "title": "The Mongoose",
    "originalTitle": "The Mongoose",
    "releaseDate": "2026-10-29",
    "year": 2026,
    "overview": "A falsely accused war hero with nothing to lose leads police on an epic televised cross-country car chase, helped by members of his former Special Forces Army battalion and closely monitored by a fascinated public rooting for his safe getaway.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/eSS5mvSG84UUuvtbHel5Yu3Wik4.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/bySCyjQXNPgsnLTlgJpSMnRazPD.jpg",
    "voteCount": 145,
    "tmdbRating": 6.2,
    "imdbRating": 6.2,
    "genres": [
      "Action",
      "Thriller"
    ],
    "popularity": 146,
    "metadataSource": "omdb",
    "imdbId": "tt13611778",
    "cast": [
      {
        "name": "Liam Neeson",
        "character": "Cast"
      },
      {
        "name": "Marisa Tomei",
        "character": "Cast"
      },
      {
        "name": "Michael Chiklis",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Mark Vanselow",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNDBmN2E2YTQtMWE2Ni00ZjMxLWE4NGItODk2ZDZjZDU0MjdlXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg",
    "runtime": 98
  },
  {
    "id": "tt34890576",
    "tmdbId": 1400940,
    "type": "movie",
    "title": "Clayface",
    "originalTitle": "Clayface",
    "releaseDate": "2026-10-19",
    "year": 2026,
    "overview": "Matt Hagen's meteoric rise from Gotham street kid to Hollywood leading man is tragically cut short when a local crime boss's actions leave him horribly disfigured. Abandoned by his team and with nothing left, Matt seeks out a cutting edge treatment that miraculously returns him to his former self… but also unexpectedly affects his grip on reality, spiraling him down a destructive path of all-consuming revenge.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/9l1NuFjel2j89hiuiJbsxfblqjy.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/xSDoxv4pHvs4xZjvTb0Iqg1A6ro.jpg",
    "voteCount": 37372,
    "tmdbRating": 7.4,
    "imdbRating": 7.5,
    "genres": [
      "Horror",
      "Thriller",
      "Sci-Fi"
    ],
    "popularity": 76,
    "metadataSource": "omdb",
    "imdbId": "tt34890576",
    "cast": [
      {
        "name": "Tom Rhys Harries",
        "character": "Cast"
      },
      {
        "name": "Tim Faraday",
        "character": "Cast"
      },
      {
        "name": "Naomi Todd",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "James Watkins",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMjNlMjM4NTAtYjE5YS00ZGYyLWEyMTYtNjFlMmIxZDEzYjhhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 108
  },
  {
    "id": "tt27995113",
    "tmdbId": 225385,
    "type": "tv",
    "title": "Black Doves",
    "originalTitle": "Black Doves",
    "releaseDate": "2024-12-05",
    "year": 2024,
    "overview": "When a spy posing as a politician's wife learns her lover has been murdered, an old assassin friend joins her on a quest for truth — and vengeance.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/srlsyEfIBz2MNWBndVc3opOaNGS.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/uyL0MH8gtDlChQKpfpkVoUP41VY.jpg",
    "voteCount": 76581,
    "tmdbRating": 7,
    "imdbRating": 7.2,
    "genres": [
      "Action",
      "Mystery",
      "Crime"
    ],
    "popularity": 78,
    "metadataSource": "omdb",
    "imdbId": "tt27995113",
    "cast": [
      {
        "name": "Keira Knightley",
        "character": "Cast"
      },
      {
        "name": "Ben Whishaw",
        "character": "Cast"
      },
      {
        "name": "Charlotte Rice-Foley",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BZTEwYTVlNmItOGUyYi00MTRjLTliNmItZmZjOTBlMTc2NGMyXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt26598805",
    "tmdbId": 292741,
    "type": "tv",
    "title": "Nocturne",
    "originalTitle": "Nocturne",
    "releaseDate": "2026-10-29",
    "year": 2026,
    "overview": "When a victim of notorious serial killer Jurek Walter unexpectedly turns up alive, detective Jonah Lynn races against time to find the one person still missing, while his protégé Saga Bauer goes undercover to get answers from the killer himself.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/nyvXVcPnHEwVmqCdzjjCsu1jqhm.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/614k6C9doThoMe6GyH0nTnGgLXt.jpg",
    "voteCount": 45,
    "tmdbRating": 7.6,
    "imdbRating": 7.6,
    "genres": [
      "Crime",
      "Drama",
      "Mystery"
    ],
    "popularity": 67,
    "metadataSource": "omdb",
    "imdbId": "tt26598805",
    "cast": [
      {
        "name": "Liev Schreiber",
        "character": "Cast"
      },
      {
        "name": "Zazie Beetz",
        "character": "Cast"
      },
      {
        "name": "Stephen Graham",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BZDI2NjUzOWEtN2VhZS00YzE5LTk4YWMtZDJmZmY5N2RiYzM3XkEyXkFqcGc@._V1_QL75_UY562_CR232,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt39943756",
    "tmdbId": 303044,
    "type": "tv",
    "title": "Campus Drivers",
    "originalTitle": "Campus Drivers",
    "releaseDate": "2026-11-06",
    "year": 2026,
    "overview": "Lois arrives in Belrose with Max, the love of her life. Lane, the creator of Campus Drivers, the hottest app on campus, is known for never getting attached. Their paths were never meant to cross. But some encounters change everything, reopening old wounds. And when love appears unexpectedly, nothing is certain anymore.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/aa1mDCaRtGNEIHVpZrh2xil03Tq.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/oaWJm4brEMSWBmQIB73DFxsU683.jpg",
    "voteCount": 35,
    "tmdbRating": 7.9,
    "imdbRating": 7.9,
    "genres": [
      "Drama"
    ],
    "popularity": 168,
    "metadataSource": "omdb",
    "imdbId": "tt39943756",
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNmMyOGU2ZWEtNzk1Mi00NTZhLWE5NjctNGI5NmEwZjQyMzA0XkEyXkFqcGc@._V1_QL75_UX760_CR0,0,760,428_.jpg",
    "cast": [],
    "crew": []
  },
  {
    "id": "tt15799564",
    "tmdbId": 891621,
    "type": "movie",
    "title": "Wild Horse Nine",
    "originalTitle": "Wild Horse Nine",
    "releaseDate": "2026-10-30",
    "year": 2026,
    "overview": "Shortly before the 1973 Chilean coup, CIA agents Chris and Lee are dispatched from Santiago to Easter Island by their bureau chief, MJ. Amongst the Island's iconic statues, and as the longtime partners wrestle with their dark pasts and present conspiracies, Chris's newfound bond with a pair of rebellious students threatens to send everyone’s trip to this remote paradise sideways.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/dNJFRtVg3xLQ7dbNIQ55cmmIniD.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/3uLA0ujne91bkzFStZICCYeqhnt.jpg",
    "voteCount": 159,
    "tmdbRating": 8.1,
    "imdbRating": 8.1,
    "genres": [
      "Comedy",
      "Crime",
      "Thriller"
    ],
    "popularity": 69,
    "metadataSource": "omdb",
    "imdbId": "tt15799564",
    "cast": [
      {
        "name": "Sam Rockwell",
        "character": "Cast"
      },
      {
        "name": "Steve Buscemi",
        "character": "Cast"
      },
      {
        "name": "Parker Posey",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Martin McDonagh",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNDc5ZDAzNmEtNTI2OS00YWI0LWE5MTYtZTJiN2RkNzRmMjA0XkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg"
  },
  {
    "id": "tt27419420",
    "tmdbId": 1153576,
    "type": "movie",
    "title": "Street Fighter",
    "originalTitle": "Street Fighter",
    "releaseDate": "2026-10-13",
    "year": 2026,
    "overview": "In 1993, estranged Street Fighters Ryu and Ken Masters are thrown back into combat when the mysterious Chun-Li recruits them for the next World Warrior Tournament: a brutal clash of fists, fate, and fury. But behind this battle royale lies a deadly conspiracy that forces them to face off against each other and the demons of their past. And if they don't, it's GAME OVER!",
    "posterUrl": "https://image.tmdb.org/t/p/w500/dJPT2Uf12X6aFg8i5N67NTpIZ9t.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/w2Gu916zS11X94CZaSLpzvfgHcG.jpg",
    "voteCount": 1231,
    "tmdbRating": 6.3,
    "imdbRating": 6.2,
    "genres": [
      "Action",
      "Fantasy"
    ],
    "popularity": 71,
    "metadataSource": "omdb",
    "imdbId": "tt27419420",
    "cast": [
      {
        "name": "Noah Centineo",
        "character": "Cast"
      },
      {
        "name": "Andrew Koji",
        "character": "Cast"
      },
      {
        "name": "Callina Liang",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Kitao Sakurai",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BYjhlN2EyNGUtY2U4YS00ZTQ3LTg0NTgtNGIxZmVhMDlmMjIyXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 119
  },
  {
    "id": "tt37287335",
    "tmdbId": 1339713,
    "type": "movie",
    "title": "Obsession",
    "originalTitle": "Obsession",
    "releaseDate": "2026-05-13",
    "year": 2026,
    "overview": "After breaking the mysterious \"One Wish Willow\" to win his crush's heart, a hopeless romantic finds himself getting exactly what he asked for but soon discovers that some desires come at a dark, sinister price.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/bRwnj8WEKBCvmfeUNOukJPwB43K.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/5lTZyuBTNOfawsfPT8Q0cIg6qAF.jpg",
    "voteCount": 392842,
    "tmdbRating": 8.2,
    "imdbRating": 7.8,
    "genres": [
      "Horror",
      "Thriller"
    ],
    "popularity": 74,
    "metadataSource": "omdb",
    "imdbId": "tt37287335",
    "cast": [
      {
        "name": "Michael Johnston",
        "character": "Cast"
      },
      {
        "name": "Inde Navarrette",
        "character": "Cast"
      },
      {
        "name": "Cooper Tomlinson",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Curry Barker",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BYzc1NWUwMDgtNGZlMS00ZmYzLWIzMzktNmMxMmY1MTUzNWExXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 109
  },
  {
    "id": "tt2056785",
    "tmdbId": 791523,
    "type": "movie",
    "title": "Wildwood",
    "originalTitle": "Wildwood",
    "releaseDate": "2026-10-19",
    "year": 2026,
    "overview": "Prue and her classmate Curtis are drawn into a magical forest filled with enchanted creatures, loyal allies, and formidable adversaries as they embark on a desperate quest to rescue Prue's abducted baby brother from a murder of crows led by a mysterious woman named Alexandra.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/snFM00mpNAfUzUtkdEW0uDEvXA0.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/sl5NJ1vtyhP9Vr88bB4blULsJYp.jpg",
    "voteCount": 15186,
    "tmdbRating": 8.5,
    "imdbRating": 8.7,
    "genres": [
      "Animation",
      "Fantasy",
      "Adventure",
      "Drama"
    ],
    "popularity": 81,
    "metadataSource": "omdb",
    "imdbId": "tt2056785",
    "cast": [
      {
        "name": "Peyton Elizabeth Lee",
        "character": "Cast"
      },
      {
        "name": "Jacob Tremblay",
        "character": "Cast"
      },
      {
        "name": "Carey Mulligan",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Travis Knight",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BN2JjOGQ1OGMtZmUwYS00YmQ2LTllNzQtZjU2YjY1NzM2NzJjXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 130
  },
  {
    "id": "tt36982492",
    "tmdbId": 307853,
    "type": "tv",
    "title": "Sunshine Through the Rain",
    "originalTitle": "今天是太阳雨",
    "releaseDate": "2026-11-06",
    "year": 2026,
    "overview": "Two struggling biology students, initially rivals for a scholarship, find mutual support and solace, transforming their relationship from competition to companionship.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/tckCJzClnmd85VIrtaycHkcgXhM.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/9LtN1ac91JAqXMke8CAJ6BiBSLS.jpg",
    "voteCount": 4,
    "tmdbRating": 10,
    "imdbRating": 10,
    "genres": [
      "Drama"
    ],
    "popularity": 28,
    "metadataSource": "omdb",
    "imdbId": "tt36982492",
    "cast": [
      {
        "name": "Winwin",
        "character": "Cast"
      },
      {
        "name": "Chaoyue Yang",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMGM5NWE3YzEtNzBjYy00M2RmLTk4N2EtNjI1MTJlNjVkMTU5XkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt35866986",
    "tmdbId": 1437511,
    "type": "movie",
    "title": "How to Rob a Bank",
    "originalTitle": "How to Rob a Bank",
    "releaseDate": "2026-11-10",
    "year": 2026,
    "overview": "A crew of social media-savvy bank robbers broadcasts their daring heists, unaware that their growing viral fame has put them in the crosshairs of a veteran FBI agent and a brilliant software engineer. Despite the unlikely duo closing in, the crime ring pushes past their limits, putting everything on the line for their most ambitious heist yet.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/ifYDZkr2qkHFz87TNVvlxajOxl5.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/u38hNQbxvIicUdfrHpqa9puBnA9.jpg",
    "voteCount": 7,
    "tmdbRating": 6.1,
    "imdbRating": 6.1,
    "genres": [
      "Action",
      "Crime",
      "Thriller"
    ],
    "popularity": 44,
    "metadataSource": "omdb",
    "imdbId": "tt35866986",
    "cast": [
      {
        "name": "Nicholas Hoult",
        "character": "Cast"
      },
      {
        "name": "Tati Gabrielle",
        "character": "Cast"
      },
      {
        "name": "John C. Reilly",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "David Leitch",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMTk5MTAxYTItZjUzMC00NDk3LWI0OWMtZjM0YTU3ODUyMDk3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    "id": "tt38420997",
    "tmdbId": 1559980,
    "type": "movie",
    "title": "The Gospel of Christmas",
    "originalTitle": "The Gospel of Christmas",
    "releaseDate": "2026-11-11",
    "year": 2026,
    "overview": "A struggling pastor moves his family to a troubled New York neighborhood, where they must save a neglected church from foreclosure before Christmas.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/ihbN6lNDXKe6w9xE6IBFMVF2Rkr.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/p1Ag7etCR5yUvElhwZmWsMo5IFu.jpg",
    "voteCount": 7,
    "tmdbRating": 5.6,
    "imdbRating": 5.6,
    "genres": [
      "Music",
      "Family",
      "Drama"
    ],
    "popularity": 34,
    "metadataSource": "omdb",
    "imdbId": "tt38420997",
    "cast": [
      {
        "name": "Fantasia Barrino",
        "character": "Cast"
      },
      {
        "name": "Durrell 'Tank' Babbs",
        "character": "Cast"
      },
      {
        "name": "Shirley Caesar",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Tyler Perry",
        "job": "Director"
      }
    ]
  },
  {
    "id": "tt31378509",
    "tmdbId": 1170608,
    "type": "movie",
    "title": "Dune: Part Three",
    "originalTitle": "Dune: Part Three",
    "releaseDate": "2026-12-15",
    "year": 2026,
    "overview": "Nearly two decades after he seized control of the Imperium, Paul Atreides is now a ruthless Emperor, and must face the consequences of his reign as old allies return, terrifying new threats emerge, and betrayal lurks in every shadow. Haunted by visions of Imperial collapse and the reappearance of his long-lost love, Paul is drawn into a sweeping conspiracy, with Chani at the heart of its unfolding mystery. As enemies close in, Paul must confront the true cost of power and the fate of those he loves the most.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/glt0v4I89rMWstDNCaFXc5SNyO1.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/i5E9H7Ik0u61ylDDTbmUpTL3Yw.jpg",
    "voteCount": 0,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Sci-Fi",
      "Adventure"
    ],
    "popularity": 25,
    "metadataSource": "omdb",
    "imdbId": "tt31378509",
    "cast": [
      {
        "name": "Timothée Chalamet",
        "character": "Cast"
      },
      {
        "name": "Zendaya",
        "character": "Cast"
      },
      {
        "name": "Jason Momoa",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Denis Villeneuve",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BYjk1NjgwZDMtYzI5OS00Y2Q4LWI1NmItNTE5OGU2NDVmMTAxXkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg"
  },
  {
    "id": "tmdb-tv-330613",
    "tmdbId": 330613,
    "type": "tv",
    "title": "The Rules",
    "originalTitle": "กฎหลังเที่ยงคืน",
    "releaseDate": "2026-10-28",
    "year": 2026,
    "overview": "Haunted by his past, Metha takes a night shift at a mysterious convenience store where breaking its strange rules leads to supernatural death, forcing him to confront both the store's dark secrets and his own sins.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/IECgq0Hd4ezuyGhbQgQawURGKT.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/VgW1XPEFiwEZgYuR2Wl204DxGL.jpg",
    "voteCount": 2,
    "tmdbRating": 8.5,
    "imdbRating": 8.5,
    "genres": [
      "Drama",
      "Mystery",
      "Sci-Fi"
    ],
    "popularity": 155,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tmdb-tv-279155",
    "tmdbId": 279155,
    "type": "tv",
    "title": "The Silent Storm",
    "originalTitle": "谷雨",
    "releaseDate": "2026-11-05",
    "year": 2026,
    "overview": "In 1994, tax auditor Ouyang Xu, criminal investigator Yan Ping'an, and Zhou Haiyang—who was searching for his missing wife—met through a counterfeit invoice case in Chunjiang City. Under the tide of the times, the three experienced vastly different circumstances, and their fates gradually diverged. Years later, Operation Grain Rain brings them together again—but the brothers of old now stand on opposite sides. Ouyang Xu faces off against the tax fraud ring led by Zhou Haiyang and the protective umbrella behind it, caught in a painful choice between emotion and the law. Starting from a single invoice, he tears away the veil of greed and ultimately eliminates evil, safeguarding justice.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/c8UHaCOfzyQYagHv7vAAOkrmgDb.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/m5tiVhzIFIqDyIPwOsHDsMDGMsK.jpg",
    "voteCount": 1,
    "tmdbRating": 9,
    "imdbRating": 9,
    "genres": [
      "Drama"
    ],
    "popularity": 19,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tt27369017",
    "tmdbId": 1058424,
    "type": "movie",
    "title": "Hope",
    "originalTitle": "호프",
    "releaseDate": "2026-07-15",
    "year": 2026,
    "overview": "In the remote South Korean village of Hope Harbor, police chief Bum-seok and officer Sung-ae are called to investigate a mysterious creature wreaking havoc on the community. But all is not as it seems, and perceptions can be misleading. What begins as ignorance plants the seed of disaster, escalating through human conflict into a tragedy of cosmic proportions.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/6VY1ZKgpsc8CfGsQcCGiYEgHdH0.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/j96rurZqmBjyY37Fncl3IB0qJNe.jpg",
    "voteCount": 4367,
    "tmdbRating": 6.8,
    "imdbRating": 6.9,
    "genres": [
      "Sci-Fi",
      "Mystery",
      "Action"
    ],
    "popularity": 298,
    "metadataSource": "omdb",
    "imdbId": "tt27369017",
    "cast": [
      {
        "name": "Hwang Jung-min",
        "character": "Cast"
      },
      {
        "name": "Zo In-sung",
        "character": "Cast"
      },
      {
        "name": "Hoyeon",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Na Hong-jin",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BZjE3ZDI0MmItMDIyMC00NzU2LTk2OTQtZTUxYTlkMjlkNmY3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 160
  },
  {
    "id": "tt37522541",
    "tmdbId": 1507696,
    "type": "movie",
    "title": "Apocalypse Z: New World",
    "originalTitle": "Apocalipsis Z: Nuevo mundo",
    "releaseDate": "2026-10-09",
    "year": 2026,
    "overview": "The Canary Islands have become Europe’s last refuge following the outbreak of the TSJ virus. When a special mission sets out for the mainland in search of vital supplies, Roberto joins the team with questionable intentions. The dangerous operation turns into a desperate race for survival, and Roberto and his companions find themselves caught between hordes of infected and divided loyalties.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/wXln4DUrwcyjcFPwgQxFPYTlG1Z.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/o3XwuDUj0n8qnK91p6q8LKfr6rj.jpg",
    "voteCount": 197,
    "tmdbRating": 6.2,
    "imdbRating": 6.2,
    "genres": [
      "Action",
      "Thriller",
      "Horror"
    ],
    "popularity": 275,
    "metadataSource": "omdb",
    "imdbId": "tt37522541",
    "cast": [
      {
        "name": "Carlos Alcaide",
        "character": "Cast"
      },
      {
        "name": "Mario Mayo",
        "character": "Cast"
      },
      {
        "name": "Lucía Moreno",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Carles Torrens",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNGI4ODQ1NGQtMTVmZS00NzcwLThmNWUtMTI4MDhkNDAyZDI0XkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg"
  },
  {
    "id": "tmdb-movie-1813355",
    "tmdbId": 1813355,
    "type": "movie",
    "title": "A Story of Derry",
    "originalTitle": "A Story of Derry",
    "releaseDate": "2026-10-31",
    "year": 2026,
    "overview": "Hundreds of years before Pennywise, three youngsters venture into the Western Wood...where they encounter a terrifying ancient spirit.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/4PtzGcegF5Po1NmDAW9IklyvAUh.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/z26LxXDMmAIzKr06FPDudCJyvsM.jpg",
    "voteCount": 113,
    "tmdbRating": 6.7,
    "imdbRating": 6.7,
    "genres": [
      "Drama",
      "Horror",
      "Mystery"
    ],
    "popularity": 282,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tmdb-movie-1244523",
    "tmdbId": 1244523,
    "type": "movie",
    "title": "Beware Boiúna",
    "originalTitle": "Beware Boiúna",
    "releaseDate": "2026-10-01",
    "year": 2026,
    "overview": "A medical mission deep in the Amazon becomes a desperate fight for survival when a colossal ancient predator awakens, turning the jungle into a deadly battleground where nature decides who lives and dies.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/uW5YMPxJUzT9bkafrCKHXjPTCoQ.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/9nU0FKNefmhbgi2xXlvZchZsqwm.jpg",
    "voteCount": 54,
    "tmdbRating": 6.2,
    "imdbRating": 6.2,
    "genres": [
      "Horror",
      "Thriller",
      "Action"
    ],
    "popularity": 175,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tt32261958",
    "tmdbId": 1283515,
    "type": "movie",
    "title": "Verity",
    "originalTitle": "Verity",
    "releaseDate": "2026-09-30",
    "year": 2026,
    "overview": "Lowen Ashleigh, hired to ghostwrite for best-selling author Verity Crawford, uncovers Verity's autobiographical notes, and becomes involved in what may prove to be a lethal conspiracy.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/rmaNMA1seHqpjtnYKzyynFAr1g8.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/cKetrF2dAnQ0AMV5i4BMOs41I5P.jpg",
    "voteCount": 685,
    "tmdbRating": 7,
    "imdbRating": 7,
    "genres": [
      "Mystery",
      "Thriller"
    ],
    "popularity": 142,
    "metadataSource": "omdb",
    "imdbId": "tt32261958",
    "cast": [
      {
        "name": "Anne Hathaway",
        "character": "Cast"
      },
      {
        "name": "Dakota Johnson",
        "character": "Cast"
      },
      {
        "name": "Josh Hartnett",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Michael Showalter",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMzUyODgxN2YtNWQ2MC00ZTQxLWJkYjMtYzYwM2RmOTcxNzFhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 114
  },
  {
    "id": "tt35511966",
    "tmdbId": 1422041,
    "type": "movie",
    "title": "La Bola Negra",
    "originalTitle": "La bola negra",
    "releaseDate": "2026-09-25",
    "year": 2026,
    "overview": "The intertwined lives of three men in three different eras, three lives intimately linked by sexuality and desire, pain, and legacy.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/7HwFQTMghL6HOvzEnXYUvyuZXeh.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/bDsmYvrzto7xrEwqDpLC3SPhn9A.jpg",
    "voteCount": 820,
    "tmdbRating": 8,
    "imdbRating": 7,
    "genres": [
      "Drama",
      "War"
    ],
    "popularity": 130,
    "metadataSource": "omdb",
    "imdbId": "tt35511966",
    "cast": [
      {
        "name": "Penélope Cruz",
        "character": "Cast"
      },
      {
        "name": "Glenn Close",
        "character": "Cast"
      },
      {
        "name": "Miguel Bernardeau",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Javier Ambrossi",
        "job": "Director"
      },
      {
        "name": "Javier Calvo",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BOGU5ODg4MDMtNjliOS00YWYzLWFlOGUtOGUwMjNmZGUyOWQ0XkEyXkFqcGc@._V1_QL75_UY562_CR7,0,380,562_.jpg",
    "runtime": 155
  },
  {
    "id": "tt37180686",
    "tmdbId": 1596275,
    "type": "movie",
    "title": "Drive - The Pretenders",
    "originalTitle": "Drive – The Pretenders",
    "releaseDate": "2026-10-27",
    "year": 2026,
    "overview": "A young mechanic fakes an engagement with racing's most scandalous star — officially for his reputation, secretly for her own shot behind the wheel. But soon the lie threatens to destroy everything — including what's already become so much more than just a deal.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/s9syckECnUYhKePQ1A0DC0mFVZ9.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/hbz4aeVsjnKb2HRoFbbr46Egh8y.jpg",
    "voteCount": 169,
    "tmdbRating": 7.6,
    "imdbRating": 7.6,
    "genres": [
      "Romance",
      "Thriller"
    ],
    "popularity": 124,
    "metadataSource": "omdb",
    "imdbId": "tt37180686",
    "cast": [
      {
        "name": "Jeanette Hain",
        "character": "Cast"
      },
      {
        "name": "Misel Maticevic",
        "character": "Cast"
      },
      {
        "name": "Philippe Brenninkmeyer",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Sergej Moya",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMTNmN2EzMGQtNDIyMi00ZDljLTk5N2ItMTA0NGJmZTJmMTEyXkEyXkFqcGc@._V1_QL75_UX656_.jpg"
  },
  {
    "id": "tt31192372",
    "tmdbId": 1101412,
    "type": "movie",
    "title": "Fall 2: Deadpoint",
    "originalTitle": "Fall 2: Deadpoint",
    "releaseDate": "2026-09-01",
    "year": 2026,
    "overview": "On a perilous climb across Thailand's Mount Kwan, two climbers become trapped thousands of feet above the ground, where vertigo-inducing heights, sheer exposure, and impossible odds turn every moment into a fight for survival.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/fgSm5ylwiXbIHn8UbUXDjk9RRu4.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/nGau0KBOaRILSK5MqFcuTfv7GMl.jpg",
    "voteCount": 1565,
    "tmdbRating": 7.3,
    "imdbRating": 5.7,
    "genres": [
      "Thriller"
    ],
    "popularity": 120,
    "metadataSource": "omdb",
    "imdbId": "tt31192372",
    "cast": [
      {
        "name": "Harriet Slater",
        "character": "Cast"
      },
      {
        "name": "Arsema Thomas",
        "character": "Cast"
      },
      {
        "name": "Tom Brittney",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Michael Spierig",
        "job": "Director"
      },
      {
        "name": "Peter Spierig",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BOTI4MjNjNDgtOWY2ZC00YTdjLThhMGItZjZiYjRhNmVhY2JhXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg",
    "runtime": 98
  },
  {
    "id": "tt41877653",
    "tmdbId": 1657630,
    "type": "movie",
    "title": "The Awakening",
    "originalTitle": "El despertar",
    "releaseDate": "2026-10-29",
    "year": 2026,
    "overview": "An elite military unit on a mission in the South American jungle encounters a deadly supernatural force revealing an ancient presence that continues to claim anyone who dares enter its domain.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/AhP971WogMHbF5iKJPKi6e6oaya.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/4pYKqctQvvdyhuGjiK4szH9jEv9.jpg",
    "voteCount": 123,
    "tmdbRating": 6.6,
    "imdbRating": 6.6,
    "genres": [
      "Horror",
      "Action",
      "War",
      "Fantasy",
      "Thriller"
    ],
    "popularity": 112,
    "metadataSource": "omdb",
    "imdbId": "tt41877653",
    "cast": [
      {
        "name": "Hudson Taylor",
        "character": "Cast"
      },
      {
        "name": "Lorenzo Callender",
        "character": "Cast"
      },
      {
        "name": "Alex Dayuha",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Justin Kalani Burbage",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BYzIxNDgzZDgtMjMxYy00YTRmLWFhMzQtOGVlNzIxNjY4ZTQwXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 83
  },
  {
    "id": "tmdb-movie-1562642",
    "tmdbId": 1562642,
    "type": "movie",
    "title": "Ghost Soldier",
    "originalTitle": "Ghost Soldier",
    "releaseDate": "2026-11-06",
    "year": 2026,
    "overview": "Henry “Fitz” Fitzgerald has spent years living quietly off the grid, hiding from a past few people know anything about. But when a powerful foreign corporation moves into his hometown to seize his neighbors’ land for a massive payday, Fitz is forced to reveal who he really is: a former Special Forces soldier and advanced weapons developer. Armed with experimental technology, lethal combat skills, and an unwavering code of justice, Fitz wages a one-man war against an enemy that never saw him coming.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/8Y4oJ5iUs3hgPcDB3SIEmsNYjZk.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/ggqvhSdAASrseKuMlzk51sbvbE8.jpg",
    "voteCount": 8,
    "tmdbRating": 9,
    "imdbRating": 9,
    "genres": [
      "Action",
      "Thriller"
    ],
    "popularity": 121,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tt37281055",
    "tmdbId": 1514026,
    "type": "movie",
    "title": "Buddy",
    "originalTitle": "Buddy",
    "releaseDate": "2026-08-27",
    "year": 2026,
    "overview": "Inside the colorful world of \"It's Buddy!\", a group of children spend their days singing, dancing, and helping Buddy - bright orange unicorn - spread happiness. But when one child refuses to play along, Buddy is not pleased and cracks begin to appear in this seemingly perfect world.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/1BdZbNvl1SfrrX8J9X5tQzN6Ivu.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/sMmG82PtjK8A9rVc34gwKQtCm3A.jpg",
    "voteCount": 5019,
    "tmdbRating": 6.8,
    "imdbRating": 7.1,
    "genres": [
      "Horror",
      "Comedy",
      "Fantasy"
    ],
    "popularity": 110,
    "metadataSource": "omdb",
    "imdbId": "tt37281055",
    "cast": [
      {
        "name": "Cristin Milioti",
        "character": "Cast"
      },
      {
        "name": "Delaney Quinn",
        "character": "Cast"
      },
      {
        "name": "Topher Grace",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Casper Kelly",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMWRkNWJhNjYtY2FkZC00YjFlLWFjMjUtZGFhMjc5MGYyODE4XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 96
  },
  {
    "id": "tmdb-movie-1228834",
    "tmdbId": 1228834,
    "type": "movie",
    "title": "The Fix",
    "originalTitle": "The Fix",
    "releaseDate": "2026-09-10",
    "year": 2026,
    "overview": "Disillusioned by the end of the war in Afghanistan, a group of disgraced, war-torn ex-CIA operatives set out to Tehran to take down a life-changing score.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/jlP8XDjZN89GrpM3je5Uf8Grqx8.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/dJTWIecL2vxsCRl5G0lRhPsfrhc.jpg",
    "voteCount": 96,
    "tmdbRating": 5.8,
    "imdbRating": 5.8,
    "genres": [
      "Action",
      "Thriller"
    ],
    "popularity": 110,
    "metadataSource": "omdb",
    "cast": [],
    "crew": []
  },
  {
    "id": "tt38515310",
    "tmdbId": 1570488,
    "type": "movie",
    "title": "A Dog's Perfect Christmas",
    "originalTitle": "A Dog's Perfect Christmas",
    "releaseDate": "2026-11-04",
    "year": 2026,
    "overview": "When a medical emergency pulls the Goss family apart, determined dog Winstead will do all he can to bring his humans back together before Christmas Eve.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/zvsNAohDHRWcGvbPSD7r3WojpKb.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/hhQT0TySg3LXCE8BEPpfPJ5zJA2.jpg",
    "voteCount": 49,
    "tmdbRating": 7.1,
    "imdbRating": 7.1,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "popularity": 101,
    "metadataSource": "omdb",
    "imdbId": "tt38515310",
    "cast": [
      {
        "name": "Mary Steenburgen",
        "character": "Cast"
      },
      {
        "name": "Jennifer Tilly",
        "character": "Cast"
      },
      {
        "name": "Dennis Quaid",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Cathryn Michon",
        "job": "Director"
      }
    ]
  },
  {
    "id": "tt12042730",
    "tmdbId": 687163,
    "type": "movie",
    "title": "Project Hail Mary",
    "originalTitle": "Project Hail Mary",
    "releaseDate": "2026-03-15",
    "year": 2026,
    "overview": "Science teacher Ryland Grace wakes up on a spaceship light years from home with no recollection of who he is or how he got there. As his memory returns, he begins to uncover his mission: solve the riddle of the mysterious substance causing the sun to die out. He must call on his scientific knowledge and unorthodox ideas to save everything on Earth from extinction.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/iOb2fjXLbpJgyQXe46n1WtGCnaa.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/8Tfys3mDZVp4tNoH2ktm06a0Tau.jpg",
    "voteCount": 570200,
    "tmdbRating": 8.6,
    "imdbRating": 8.2,
    "genres": [
      "Sci-Fi",
      "Adventure"
    ],
    "popularity": 634,
    "metadataSource": "omdb",
    "imdbId": "tt12042730",
    "cast": [
      {
        "name": "Ryan Gosling",
        "character": "Cast"
      },
      {
        "name": "Sandra Hüller",
        "character": "Cast"
      },
      {
        "name": "James Ortiz",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Phil Lord",
        "job": "Director"
      },
      {
        "name": "Christopher Miller",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNTkwNzJiYTctNzI3NC00NjE1LTlhYjktY2Q5MTdmMWFmNzcxXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "runtime": 156
  },
  {
    "id": "tt13186306",
    "tmdbId": 755898,
    "type": "movie",
    "title": "War of the Worlds",
    "originalTitle": "War of the Worlds",
    "releaseDate": "2025-07-29",
    "year": 2025,
    "overview": "Will Radford is a top analyst for Homeland Security who tracks potential threats through a mass surveillance program, until one day an attack by an unknown entity leads him to question whether the government is hiding something from him... and from the rest of the world.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/yvirUYrva23IudARHn3mMGVxWqM.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/iZLqwEwUViJdSkGVjePGhxYzbDb.jpg",
    "voteCount": 34881,
    "tmdbRating": 4,
    "imdbRating": 2.5,
    "genres": [
      "Sci-Fi",
      "Thriller"
    ],
    "popularity": 79,
    "metadataSource": "omdb",
    "imdbId": "tt13186306",
    "cast": [
      {
        "name": "Ice Cube",
        "character": "Cast"
      },
      {
        "name": "Eva Longoria",
        "character": "Cast"
      },
      {
        "name": "Iman Benson",
        "character": "Cast"
      }
    ],
    "crew": [
      {
        "name": "Rich Lee",
        "job": "Director"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BOWVlZDUzNTgtYzcxNC00OTYyLThlZjYtZDc1MTM2ZmI1Y2IzXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg",
    "runtime": 91
  },
  {
    "id": "tt32267726",
    "tmdbId": 253376,
    "type": "tv",
    "title": "The Girlfriend",
    "originalTitle": "The Girlfriend",
    "releaseDate": "2025-09-10",
    "year": 2025,
    "overview": "Laura has it all: a glittering career, a loving husband, and her precious son, Daniel. But her perfect life unravels when Daniel brings home Cherry, a girlfriend who changes everything. After a tense introduction, Laura becomes convinced Cherry is hiding something. Is she a manipulative social climber, or is Laura just paranoid? The truth is a matter of perspective.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/ktrp3tdZ5IQpFux4nLy8z70bt3n.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/lnVWmFvLv2pTZGsuAJytiqKu541.jpg",
    "voteCount": 26262,
    "tmdbRating": 7.1,
    "imdbRating": 7.1,
    "genres": [
      "Drama",
      "Mystery"
    ],
    "popularity": 700,
    "metadataSource": "omdb",
    "imdbId": "tt32267726",
    "cast": [
      {
        "name": "Robin Wright",
        "character": "Cast"
      },
      {
        "name": "Olivia Cooke",
        "character": "Cast"
      },
      {
        "name": "Laurie Davidson",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNjU2OWNjMDctYzdhMi00ZmUwLTk1OTYtYmNkMjE1MDBjMDU1XkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt45246384",
    "tmdbId": 303745,
    "type": "tv",
    "title": "Love in Disguise",
    "originalTitle": "나의 유죄인간",
    "releaseDate": "2026-10-19",
    "year": 2026,
    "overview": "Taekang Group's successor, Yoon Yi-jun, is the prime suspect of a shocking murder. To uncover the truth, Kang Jae-hee goes undercover as a male secretary to keep an eye on Yi-jun. The closer they get to what really happened, the closer Yi-jun and Jae-hee become. Will Jae-hee, who is hiding her identity, and Yi-jun, who is hiding a secret, be able to let their true feelings be known to one another?",
    "posterUrl": "https://image.tmdb.org/t/p/w500/c9DEtqCDZBPL9i06WmbDrcndrBy.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/ob7m6JqZ7jSOocR3VL73VxRC6Is.jpg",
    "voteCount": 68,
    "tmdbRating": 9,
    "imdbRating": 9,
    "genres": [
      "Comedy",
      "Drama",
      "Crime",
      "Action"
    ],
    "popularity": 122,
    "metadataSource": "omdb",
    "imdbId": "tt45246384",
    "cast": [
      {
        "name": "Yim Si-wan",
        "character": "Cast"
      },
      {
        "name": "Seol In-ah",
        "character": "Cast"
      },
      {
        "name": "Kim Jung-hyun",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNWY3ZjliZTUtYjc5Yy00YTEzLWE2NDQtMWUxNGU1NDgyMjRiXkEyXkFqcGc@._V1_QL75_UY562_CR9,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt36458668",
    "tmdbId": 289517,
    "type": "tv",
    "title": "Dead-End Job",
    "originalTitle": "꿀알바",
    "releaseDate": "2026-10-30",
    "year": 2026,
    "overview": "Drowning in debt, a young man takes lucrative part-time jobs from a mysterious agency — only to find his hustle for more money turning nightmarish.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/wUvzMC7EToPgci31ZZRCeqCmQ6d.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/gWedDgBsZkuOho2qe3q2sTQmbpO.jpg",
    "voteCount": 93,
    "tmdbRating": 7.5,
    "imdbRating": 7.5,
    "genres": [
      "Mystery",
      "Drama"
    ],
    "popularity": 96,
    "metadataSource": "omdb",
    "imdbId": "tt36458668",
    "cast": [
      {
        "name": "Lee Jae-wook",
        "character": "Cast"
      },
      {
        "name": "Go Min-si",
        "character": "Cast"
      },
      {
        "name": "Kim Min-ha",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BNDcwNjBmODctOWFmZC00MjYzLTkwN2MtZWZlMjQ1OWNmNTQxXkEyXkFqcGc@._V1_SX300.jpg",
    "crew": []
  },
  {
    "id": "tt39395275",
    "tmdbId": 312359,
    "type": "tv",
    "title": "Dragon Ball Super: Beerus",
    "originalTitle": "ドラゴンボール超 ビルス",
    "releaseDate": "2026-10-11",
    "year": 2026,
    "overview": "When Beerus, the God of Destruction, awakens in search of a worthy rival, Goku and his friends face an epic battle to stop him from destroying Earth.\n\nRemastered and re-edited version of Dragon Ball Super.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/AojgldgsOlzZV8ahyOzaiAjJWvV.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/8phLVFEXOe02JgFmH9ldn3j4tXW.jpg",
    "voteCount": 413,
    "tmdbRating": 9.6,
    "imdbRating": 9.6,
    "genres": [
      "Animation",
      "Action",
      "Sci-Fi"
    ],
    "popularity": 87,
    "metadataSource": "omdb",
    "imdbId": "tt39395275",
    "cast": [
      {
        "name": "Kôichi Yamadera",
        "character": "Cast"
      },
      {
        "name": "Masako Nozawa",
        "character": "Cast"
      },
      {
        "name": "Ryô Horikawa",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMGZlN2Q4ODgtYjZiNC00MTU4LWFkMmUtNmFhOTdjMjQ3YTQwXkEyXkFqcGc@._V1_SX300.jpg",
    "crew": []
  },
  {
    "id": "tt36849871",
    "tmdbId": 290856,
    "type": "tv",
    "title": "Marshals",
    "originalTitle": "Marshals",
    "releaseDate": "2026-03-01",
    "year": 2026,
    "overview": "With the Yellowstone Ranch behind him, Kayce Dutton joins an elite unit of U.S. Marshals, combining his skills as a cowboy and Navy SEAL to bring range justice to Montana, where he and his teammates must balance family, duty and the high psychological cost that comes with serving as the last line of defense in the region's war on violence.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/zV1MRb6eqx6Uj3NSXquZFfz75pa.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/yGJGwt7DdIWTUXuahLfhcH1gi7G.jpg",
    "voteCount": 18497,
    "tmdbRating": 8,
    "imdbRating": 6.1,
    "genres": [
      "Drama",
      "Crime",
      "Action"
    ],
    "popularity": 79,
    "metadataSource": "omdb",
    "imdbId": "tt36849871",
    "cast": [
      {
        "name": "Luke Grimes",
        "character": "Cast"
      },
      {
        "name": "Ash Santos",
        "character": "Cast"
      },
      {
        "name": "Tatanka Means",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BOTk4NThjNzgtMjVjNi00MjdjLWE1NDctMzRhNTI1Y2RiN2NkXkEyXkFqcGc@._V1_QL75_UY562_CR4,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt31938062",
    "tmdbId": 250307,
    "type": "tv",
    "title": "The Pitt",
    "originalTitle": "The Pitt",
    "releaseDate": "2025-01-09",
    "year": 2025,
    "overview": "The staff of Pittsburgh's Trauma Medical Center work around the clock to save lives in an overcrowded and underfunded emergency department.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/z3BkMbCy5ajZPMyKEUwsPHuz2cV.jpg",
    "voteCount": 168895,
    "tmdbRating": 8.7,
    "imdbRating": 8.9,
    "genres": [
      "Drama"
    ],
    "popularity": 97,
    "metadataSource": "omdb",
    "imdbId": "tt31938062",
    "cast": [
      {
        "name": "Noah Wyle",
        "character": "Cast"
      },
      {
        "name": "Patrick Ball",
        "character": "Cast"
      },
      {
        "name": "Katherine LaNasa",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BMThjMjYxM2YtM2IzZC00NDdmLThiNDYtNzEyNzA0YTRmYTk3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt19244304",
    "tmdbId": 200875,
    "type": "tv",
    "title": "IT: Welcome to Derry",
    "originalTitle": "IT: Welcome to Derry",
    "releaseDate": "2025-10-26",
    "year": 2025,
    "overview": "In 1962, amid a spate of unexplained disappearances of local children, a group of misfit friends begin to suspect a long-buried ancient evil lurking. As the kids set out to determine what's really going on, a rising unease prompts several townspeople to work together to restore peace – all while a U.S. military operation seeks to exploit Derry for its own objectives.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/nyy3BITeIjviv6PFIXtqvc8i6xi.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/2fOKVDoc2O3eZmBZesWPuE5kgPN.jpg",
    "voteCount": 120843,
    "tmdbRating": 8.3,
    "imdbRating": 7.9,
    "genres": [
      "Drama",
      "Mystery"
    ],
    "popularity": 67,
    "metadataSource": "omdb",
    "imdbId": "tt19244304",
    "cast": [
      {
        "name": "Jovan Adepo",
        "character": "Cast"
      },
      {
        "name": "Bill Skarsgård",
        "character": "Cast"
      },
      {
        "name": "Taylour Paige",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BZWE0ZWM1MjUtNmYzYS00NzU3LTkxYmQtNmI3NTc0ZTY1NmVlXkEyXkFqcGc@._V1_QL75_UY562_CR35,0,380,562_.jpg",
    "crew": []
  },
  {
    "id": "tt21906238",
    "tmdbId": 208921,
    "type": "tv",
    "title": "Rivals",
    "originalTitle": "Rivals",
    "releaseDate": "2024-10-18",
    "year": 2024,
    "overview": "It is 1986 and Britain is booming. \"Rivals\" dives headfirst into the cutthroat world of TV where hair-dos are big and ambitions are even bigger. Deals are brokered in boardrooms, as well as bedrooms. Nobody can be sure who will come out on top. With every man and woman out only for themselves, can true love really blossom?",
    "posterUrl": "https://image.tmdb.org/t/p/w500/3p9t1KDo5iXAn1zsSPn8sdtakWs.jpg",
    "backdropUrl": "https://image.tmdb.org/t/p/w1280/vPw5Gpg0YEEk1VsE8QlmyTxIJuU.jpg",
    "voteCount": 20815,
    "tmdbRating": 7.4,
    "imdbRating": 7.9,
    "genres": [
      "Drama"
    ],
    "popularity": 73,
    "metadataSource": "omdb",
    "imdbId": "tt21906238",
    "cast": [
      {
        "name": "David Tennant",
        "character": "Cast"
      },
      {
        "name": "Danny Dyer",
        "character": "Cast"
      },
      {
        "name": "Alex Hassell",
        "character": "Cast"
      }
    ],
    "fallbackPosterUrl": "https://m.media-amazon.com/images/M/MV5BZjA5ZDZkYTQtYzZjZi00YmRmLWIzNDItNTE2YjkwYmI4MjdhXkEyXkFqcGc@._V1_QL75_UX380_CR0,57,380,562_.jpg",
    "crew": []
  }
];

export async function fetchTMDBRecommendations(apiKey?: string): Promise<MediaItem[]> {
  let liveItems: MediaItem[] = [];
  try {
    liveItems = await fetchTMDBLatestTrendingCatalog(apiKey, 90);
    if (liveItems && liveItems.length >= 50) {
      return liveItems;
    }
  } catch (err) {
    console.warn('Falling back to curated TMDB recommendations:', err);
  }

  const seen = new Set<string>(liveItems.map(i => (i.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
  const merged: MediaItem[] = [...liveItems];

  const [movies, series] = await Promise.all([
    fetchNetflixTop10Movies(apiKey).catch(() => []),
    fetchNetflixTop10Series(apiKey).catch(() => []),
  ]);

  for (const item of [...movies, ...series, ...CURATED_OMDB_RECOMMENDATIONS.map(c => ({ ...c, metadataSource: 'tmdb' as const }))]) {
    const key = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

export async function fetchOMDBRecommendations(
  omdbApiKey?: string,
  tmdbApiKey?: string,
  forceRefresh = false
): Promise<MediaItem[]> {
  try {
    const liveItems = await fetchOMDBLatestTrendingCatalog(
      omdbApiKey,
      tmdbApiKey,
      CURATED_OMDB_RECOMMENDATIONS,
      forceRefresh
    );
    if (liveItems && liveItems.length >= 50) {
      return liveItems;
    }
    if (liveItems && liveItems.length > 0) {
      const seen = new Set(liveItems.map(i => (i.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
      const padded = [...liveItems];
      for (const item of CURATED_OMDB_RECOMMENDATIONS) {
        const k = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(k)) {
          seen.add(k);
          padded.push(item);
        }
      }
      return padded;
    }
  } catch (err) {
    console.warn('Live OMDb exploration catalog failed, using curated 2024-2026 catalog:', err);
  }

  return CURATED_OMDB_RECOMMENDATIONS;
}

export async function fetchExploreRecommendations(
  providerOrApiKey?: 'tmdb' | 'omdb' | string,
  tmdbApiKey?: string,
  omdbApiKey?: string,
  forceRefresh = false
): Promise<MediaItem[]> {
  const provider = providerOrApiKey === 'omdb' ? 'omdb' : 'tmdb';
  const tKey = providerOrApiKey !== 'omdb' && providerOrApiKey !== 'tmdb' ? providerOrApiKey : tmdbApiKey;
  const oKey = omdbApiKey;

  if (provider === 'omdb') {
    return fetchOMDBRecommendations(oKey, tKey, forceRefresh);
  }
  return fetchTMDBRecommendations(tKey);
}

export function getCuratedExploreMediaItems(): MediaItem[] {
  return [];
}

export async function fetchMediaDetails(id: string): Promise<Partial<MediaItem>> {
  return { id };
}

export { testTMDBConnection, searchTMDB };
export { testOMDbConnection, testOMDbSearch, type DiagnosticResult } from '../services/omdb';
