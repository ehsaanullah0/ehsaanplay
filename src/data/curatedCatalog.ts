import { MediaItem } from '../types/movie';
import { fetchTMDBTrending, testTMDBConnection, searchTMDB } from '../services/tmdb';

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
      overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
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
      overview: 'When Earth becomes uninhabitable in the future, Joseph Cooper is tasked to pilot a spacecraft to find a new planet for humans.',
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
  ];
}

export const CURATED_OMDB_RECOMMENDATIONS: MediaItem[] = [
  {
    id: 'omdb-tt0468569',
    imdbId: 'tt0468569',
    type: 'movie',
    title: 'The Dark Knight',
    originalTitle: 'The Dark Knight',
    releaseDate: '2008-07-18',
    year: 2008,
    overview: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    voteCount: 2900000,
    imdbRating: 9.0,
    genres: ['Action', 'Crime', 'Drama'],
    cast: [{ name: 'Christian Bale', character: 'Bruce Wayne / Batman' }, { name: 'Heath Ledger', character: 'Joker' }],
    crew: [{ name: 'Christopher Nolan', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt15398776',
    imdbId: 'tt15398776',
    type: 'movie',
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    releaseDate: '2023-07-21',
    year: 2023,
    overview: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMDBmYTZjNjUtN2M1MS00MTQ2LTk2ODgtNzc2M2QyZGE5NTVjXkEyXkFqcGdeQXVyNzAwMjU2MTY@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    voteCount: 820000,
    imdbRating: 8.9,
    genres: ['Biography', 'Drama', 'History'],
    cast: [{ name: 'Cillian Murphy', character: 'J. Robert Oppenheimer' }, { name: 'Emily Blunt', character: 'Kitty Oppenheimer' }],
    crew: [{ name: 'Christopher Nolan', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt15239678',
    imdbId: 'tt15239678',
    type: 'movie',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    releaseDate: '2024-03-01',
    year: 2024,
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BN2QyZGU4ZDctOWMzMy00NWUzLWIxZTUtNjRhNzBkNmY3Y2WMXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520FFq.jpg',
    voteCount: 560000,
    imdbRating: 8.6,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    cast: [{ name: 'Timothée Chalamet', character: 'Paul Atreides' }, { name: 'Zendaya', character: 'Chani' }],
    crew: [{ name: 'Denis Villeneuve', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt0110912',
    imdbId: 'tt0110912',
    type: 'movie',
    title: 'Pulp Fiction',
    originalTitle: 'Pulp Fiction',
    releaseDate: '1994-10-14',
    year: 1994,
    overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5Nzcw._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
    voteCount: 2200000,
    imdbRating: 8.9,
    genres: ['Crime', 'Drama'],
    cast: [{ name: 'John Travolta', character: 'Vincent Vega' }, { name: 'Samuel L. Jackson', character: 'Jules Winnfield' }],
    crew: [{ name: 'Quentin Tarantino', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt0133093',
    imdbId: 'tt0133093',
    type: 'movie',
    title: 'The Matrix',
    originalTitle: 'The Matrix',
    releaseDate: '1999-03-31',
    year: 1999,
    overview: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/l4QHerTSbTM7qgRPCzknxs93Urv.jpg',
    voteCount: 2050000,
    imdbRating: 8.7,
    genres: ['Action', 'Sci-Fi'],
    cast: [{ name: 'Keanu Reeves', character: 'Neo' }, { name: 'Laurence Fishburne', character: 'Morpheus' }],
    crew: [{ name: 'Lana Wachowski', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt0111161',
    imdbId: 'tt0111161',
    type: 'movie',
    title: 'The Shawshank Redemption',
    originalTitle: 'The Shawshank Redemption',
    releaseDate: '1994-09-22',
    year: 1994,
    overview: 'A banker convicted of uxoricide forms a friendship over a quarter of a century with a hardened convict, while maintaining his innocence.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMDFkYTc0MGEtZmNhMC00ZDIzLWFmNTEtODM1ZmRlYWMwMWFmXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
    voteCount: 2900000,
    imdbRating: 9.3,
    genres: ['Drama'],
    cast: [{ name: 'Tim Robbins', character: 'Andy Dufresne' }, { name: 'Morgan Freeman', character: 'Red' }],
    crew: [{ name: 'Frank Darabont', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt0172495',
    imdbId: 'tt0172495',
    type: 'movie',
    title: 'Gladiator',
    originalTitle: 'Gladiator',
    releaseDate: '2000-05-05',
    year: 2000,
    overview: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMDliMmNhNDEtODUyOS00MjNlLTgxODEtN2U3NzIxMGVkZTA1L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ArWnql9ns1Es49VcAjtZ0buh29q.jpg',
    voteCount: 1650000,
    imdbRating: 8.5,
    genres: ['Action', 'Adventure', 'Drama'],
    cast: [{ name: 'Russell Crowe', character: 'Maximus' }, { name: 'Joaquin Phoenix', character: 'Commodus' }],
    crew: [{ name: 'Ridley Scott', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt6751668',
    imdbId: 'tt6751668',
    type: 'movie',
    title: 'Parasite',
    originalTitle: 'Gisaengchung',
    releaseDate: '2019-05-30',
    year: 2019,
    overview: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00M2VkLWE0NDktNWRiYzA2NzkzYTZlXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg',
    voteCount: 950000,
    imdbRating: 8.5,
    genres: ['Drama', 'Thriller'],
    cast: [{ name: 'Song Kang-ho', character: 'Kim Ki-taek' }, { name: 'Lee Sun-kyun', character: 'Park Dong-ik' }],
    crew: [{ name: 'Bong Joon Ho', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt2582802',
    imdbId: 'tt2582802',
    type: 'movie',
    title: 'Whiplash',
    originalTitle: 'Whiplash',
    releaseDate: '2014-10-15',
    year: 2014,
    overview: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BOTA5NDZlZGUtMjAxOS00YTRkLTkwYmMtYWQ0NWEwZD阳MWY0XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/vNXGRkn1wV4y2oUj66k03aW2k1o.jpg',
    voteCount: 990000,
    imdbRating: 8.5,
    genres: ['Drama', 'Music'],
    cast: [{ name: 'Miles Teller', character: 'Andrew Neiman' }, { name: 'J.K. Simmons', character: 'Terence Fletcher' }],
    crew: [{ name: 'Damien Chazelle', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt4633694',
    imdbId: 'tt4633694',
    type: 'movie',
    title: 'Spider-Man: Into the Spider-Verse',
    originalTitle: 'Spider-Man: Into the Spider-Verse',
    releaseDate: '2018-12-14',
    year: 2018,
    overview: 'Teen Miles Morales becomes the new Spider-Man and joins other Spider-Heroes from parallel dimensions to stop a threat to all reality.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjMwNDkxMTgyNV5BMl5BanBnXkFtZTgwNjkwNTM0NzM@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/7d6o006rS2bA8pD7p9f5W1A09.jpg',
    voteCount: 680000,
    imdbRating: 8.4,
    genres: ['Animation', 'Action', 'Adventure'],
    cast: [{ name: 'Shameik Moore', character: 'Miles Morales' }, { name: 'Jake Johnson', character: 'Peter B. Parker' }],
    crew: [{ name: 'Bob Persichetti', job: 'Director' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt2788316',
    imdbId: 'tt2788316',
    type: 'tv',
    title: 'Shōgun',
    originalTitle: 'Shōgun',
    releaseDate: '2024-02-27',
    year: 2024,
    overview: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMmU1NmE5YWMtOTdiMC00N2MwLWI3Y2EtMmVmZDIxNGY2YTNhXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/tQ0Z4b4mQ16x9rP08d9s2010.jpg',
    voteCount: 180000,
    imdbRating: 8.7,
    genres: ['Adventure', 'Drama', 'History'],
    seasonsCount: 1,
    episodesCount: 10,
    cast: [{ name: 'Hiroyuki Sanada', character: 'Lord Yoshii Toranaga' }, { name: 'Cosmo Jarvis', character: 'John Blackthorne' }],
    crew: [{ name: 'Rachel Kondo', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt11126994',
    imdbId: 'tt11126994',
    type: 'tv',
    title: 'Arcane',
    originalTitle: 'Arcane',
    releaseDate: '2021-11-06',
    year: 2021,
    overview: 'Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BYTViYTE3NWQtNDBlZS00MTA5LWEzYmEtZmRhMmQ1YzQzYzA2XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/fqv8v6AycXKsivp1TddowoqPRht.jpg',
    voteCount: 310000,
    imdbRating: 9.0,
    genres: ['Animation', 'Action', 'Sci-Fi'],
    seasonsCount: 2,
    episodesCount: 18,
    cast: [{ name: 'Hailee Steinfeld', character: 'Vi' }, { name: 'Ella Purnell', character: 'Jinx' }],
    crew: [{ name: 'Christian Linke', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt11280740',
    imdbId: 'tt11280740',
    type: 'tv',
    title: 'Severance',
    originalTitle: 'Severance',
    releaseDate: '2022-02-18',
    year: 2022,
    overview: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BOThjOTMyM2QtNTNhNy00NmM0LWFkMGQtNjAyNjU5YTU1NDhhXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/t5zCBSB5xMOMlXIC0v799yA01.jpg',
    voteCount: 230000,
    imdbRating: 8.7,
    genres: ['Drama', 'Mystery', 'Sci-Fi'],
    seasonsCount: 2,
    episodesCount: 19,
    cast: [{ name: 'Adam Scott', character: 'Mark Scout' }, { name: 'Zach Cherry', character: 'Dylan George' }],
    crew: [{ name: 'Dan Erickson', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt3581920',
    imdbId: 'tt3581920',
    type: 'tv',
    title: 'The Last of Us',
    originalTitle: 'The Last of Us',
    releaseDate: '2023-01-15',
    year: 2023,
    overview: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity\'s last hope.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BYzA4ZjhhNGEtYzczYS00NGU2LThkZTItMWFhOGUxZWM4MmQ3XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
    voteCount: 560000,
    imdbRating: 8.7,
    genres: ['Action', 'Adventure', 'Drama'],
    seasonsCount: 1,
    episodesCount: 9,
    cast: [{ name: 'Pedro Pascal', character: 'Joel Miller' }, { name: 'Bella Ramsey', character: 'Ellie Williams' }],
    crew: [{ name: 'Craig Mazin', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt7660850',
    imdbId: 'tt7660850',
    type: 'tv',
    title: 'Succession',
    originalTitle: 'Succession',
    releaseDate: '2018-06-03',
    year: 2018,
    overview: 'The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their aging father steps down from the company.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BZDE0ODgwNjMtNWY0OC00YjBhLTg4NDAtYjJiNjY4NmNkOGQ1XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/qtfMr08KOGWXvox9v901.jpg',
    voteCount: 280000,
    imdbRating: 8.9,
    genres: ['Drama'],
    seasonsCount: 4,
    episodesCount: 39,
    cast: [{ name: 'Brian Cox', character: 'Logan Roy' }, { name: 'Jeremy Strong', character: 'Kendall Roy' }],
    crew: [{ name: 'Jesse Armstrong', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt14452776',
    imdbId: 'tt14452776',
    type: 'tv',
    title: 'The Bear',
    originalTitle: 'The Bear',
    releaseDate: '2022-06-23',
    year: 2022,
    overview: 'A young chef from the fine dining world comes home to Chicago to run his family Italian beef sandwich shop.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BNmU4M2E3Y2UtZTY4Ni00MGViLTg2MWYtZDUzYTU2NTZkYTY2XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/mAMbvvWpM1qA09zN712.jpg',
    voteCount: 260000,
    imdbRating: 8.6,
    genres: ['Comedy', 'Drama'],
    seasonsCount: 3,
    episodesCount: 28,
    cast: [{ name: 'Jeremy Allen White', character: 'Carmen Berzatto' }, { name: 'Ebon Moss-Bachrach', character: 'Richard Jerimovich' }],
    crew: [{ name: 'Christopher Storer', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt12637874',
    imdbId: 'tt12637874',
    type: 'tv',
    title: 'Fallout',
    originalTitle: 'Fallout',
    releaseDate: '2024-04-10',
    year: 2024,
    overview: 'In a future, post-apocalyptic Los Angeles brought about by nuclear decimation, citizens must live in underground bunkers to protect themselves from radiation, mutants and bandits.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BOGJmMTFkNWYtOTY1Mi00ZDM0LTg4OTAtM2Y5NmQ1ZWE1MGU5XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8mOU4nB9m2P02L8s0.jpg',
    voteCount: 220000,
    imdbRating: 8.4,
    genres: ['Action', 'Adventure', 'Drama'],
    seasonsCount: 1,
    episodesCount: 8,
    cast: [{ name: 'Ella Purnell', character: 'Lucy MacLean' }, { name: 'Walton Goggins', character: 'The Ghoul' }],
    crew: [{ name: 'Geneva Robertson-Dworet', job: 'Creator' }],
    metadataSource: 'omdb',
  },
  {
    id: 'omdb-tt8762206',
    imdbId: 'tt8762206',
    type: 'tv',
    title: 'Chernobyl',
    originalTitle: 'Chernobyl',
    releaseDate: '2019-05-06',
    year: 2019,
    overview: 'In April 1986, an explosion at the Chernobyl nuclear power plant in the Union of Soviet Socialist Republics becomes one of the world\'s worst man-made catastrophes.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BNTEyZGU5MmQtYWYxMS00N2EzLTg4NDEtNWUxZTQ4N2RhNjA4XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/uL6Ad12Fe4Kh3LQ8R5k4a2.jpg',
    voteCount: 920000,
    imdbRating: 9.3,
    genres: ['Drama', 'History', 'Thriller'],
    seasonsCount: 1,
    episodesCount: 5,
    cast: [{ name: 'Jared Harris', character: 'Valery Legasov' }, { name: 'Stellan Skarsgård', character: 'Boris Shcherbina' }],
    crew: [{ name: 'Craig Mazin', job: 'Creator' }],
    metadataSource: 'omdb',
  },
];

export async function fetchTMDBRecommendations(apiKey?: string): Promise<MediaItem[]> {
  try {
    const trendingAll = await fetchTMDBTrending('all', 'week', apiKey);
    if (trendingAll && trendingAll.length > 0) {
      return trendingAll;
    }
  } catch (err) {
    console.warn('Falling back to curated TMDB recommendations:', err);
  }

  const movies = await fetchNetflixTop10Movies(apiKey);
  const series = await fetchNetflixTop10Series(apiKey);
  return [...movies, ...series];
}

export async function fetchOMDBRecommendations(apiKey?: string): Promise<MediaItem[]> {
  // If user configured a custom key or default key is available, attempt live OMDb search queries
  try {
    const { searchOMDB } = await import('../services/omdb');
    const queries = ['2024', 'Marvel', 'Batman', 'Space'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const liveResults = await searchOMDB(randomQuery, apiKey);
    if (liveResults && liveResults.length > 0) {
      // Merge with curated list so posters and metadata are guaranteed top tier
      const map = new Map<string, MediaItem>();
      for (const item of CURATED_OMDB_RECOMMENDATIONS) {
        map.set(item.imdbId || item.id, item);
      }
      for (const item of liveResults) {
        const key = item.imdbId || item.id;
        if (!map.has(key) && item.posterUrl) {
          map.set(key, { ...item, metadataSource: 'omdb' });
        }
      }
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn('Live OMDb exploration search failed, using curated catalog:', err);
  }

  return CURATED_OMDB_RECOMMENDATIONS;
}

export async function fetchExploreRecommendations(
  providerOrApiKey?: 'tmdb' | 'omdb' | string,
  tmdbApiKey?: string,
  omdbApiKey?: string
): Promise<MediaItem[]> {
  const provider = providerOrApiKey === 'omdb' ? 'omdb' : 'tmdb';
  const tKey = providerOrApiKey !== 'omdb' && providerOrApiKey !== 'tmdb' ? providerOrApiKey : tmdbApiKey;
  const oKey = omdbApiKey;

  if (provider === 'omdb') {
    return fetchOMDBRecommendations(oKey);
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
