import { createServerFn } from "@tanstack/react-start";
import { TMDB, TMDB_IMAGE_BASE_URL } from "@api-wrappers/tmdb-wrapper";
import { z } from "zod";

export const TMDB_IMG = TMDB_IMAGE_BASE_URL;

// Fallback for local/dev templates where non-VITE server env vars are not injected.
// Prefer environment variables in production.
const TMDB_FALLBACK_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MjE5YTU2ZDljMTAyNDRmNzg3M2NmMTlkMjZlMTk5YSIsIm5iZiI6MTc4MTYwNzIzMC41NDQsInN1YiI6IjZhMzEyYjNlM2YxOGM5ZWQzZWJiZmQyYiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.BsXd2yRv1xDfMSKw3GoJgTYPikqrsBTutdTf-aPv9t8";

// Public sample HLS streams paired by index with TMDB ids (so detail/play pages have something to play).
const SAMPLE_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://test-streams.mux.dev/pts_shift/master.m3u8",
  "https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8",
  "https://test-streams.mux.dev/pts_shift/master.m3u8",
];

export function sampleStreamFor(id: string | number): string {
  const n = typeof id === "number" ? id : Number(id.replace(/\D/g, "")) || 0;
  return SAMPLE_STREAMS[Math.abs(n) % SAMPLE_STREAMS.length];
}

export type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
  genre_ids?: number[];
};

const GENRE_MAP: Record<string, number> = {
  action: 28,
  comedy: 35,
  drama: 18,
  horror: 27,
  romance: 10749,
  scifi: 878,
  thriller: 53,
  animation: 16,
};

function getTmdbClient(): TMDB | null {
  const accessToken =
    process.env.TMDB_ACCESS_TOKEN ??
    process.env.TMDB_READ_ACCESS_TOKEN ??
    import.meta.env.VITE_TMDB_ACCESS_TOKEN ??
    import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN ??
    TMDB_FALLBACK_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY ?? import.meta.env.VITE_TMDB_API_KEY;
  if (!accessToken && !apiKey) return null;
  if (accessToken) return new TMDB(accessToken);
  return new TMDB({ apiKey });
}

async function safeCall<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch {
    return null;
  }
}

export const getHomeRows = createServerFn({ method: "GET" }).handler(async () => {
  const tmdb = getTmdbClient();
  const hasKey = Boolean(tmdb);
  if (!tmdb) {
    return { hasKey, rows: [], hero: null as TmdbMovie | null };
  }
  const [trending, top, popular, action, comedy, horror] = await Promise.all([
    safeCall(() => tmdb.trending.trending("movie", "week", { language: "en-US", page: 1 })),
    safeCall(() => tmdb.movies.topRated({ language: "en-US", page: 1 })),
    safeCall(() => tmdb.movies.popular({ language: "en-US", page: 1 })),
    safeCall(() => tmdb.discover.movie({ with_genres: String(GENRE_MAP.action), sort_by: "popularity.desc", language: "en-US", page: 1 })),
    safeCall(() => tmdb.discover.movie({ with_genres: String(GENRE_MAP.comedy), sort_by: "popularity.desc", language: "en-US", page: 1 })),
    safeCall(() => tmdb.discover.movie({ with_genres: String(GENRE_MAP.horror), sort_by: "popularity.desc", language: "en-US", page: 1 })),
  ]);
  const rows = [
    { id: "trending", title: "Trending Now", items: (trending?.results ?? []) as TmdbMovie[] },
    { id: "top", title: "Top Rated", items: (top?.results ?? []) as TmdbMovie[] },
    { id: "popular", title: "Popular on StreamFlix", items: (popular?.results ?? []) as TmdbMovie[] },
    { id: "action", title: "Action & Adventure", items: (action?.results ?? []) as TmdbMovie[] },
    { id: "comedy", title: "Laugh Out Loud", items: (comedy?.results ?? []) as TmdbMovie[] },
    { id: "horror", title: "Spine-Chilling Horror", items: (horror?.results ?? []) as TmdbMovie[] },
  ];
  const heroPool = trending?.results?.filter((m) => m.backdrop_path) ?? [];
  const hero = heroPool[Math.floor(Math.random() * Math.min(5, heroPool.length))] ?? null;
  return { hasKey, rows, hero };
});

export const getMovie = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const tmdb = getTmdbClient();
    const id = Number(data.id);
    if (!tmdb || Number.isNaN(id)) return null;
    return await safeCall(() => tmdb.movies.details(id, undefined, "en-US"));
  });

export const getGenreMovies = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ genre: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const genreId = GENRE_MAP[data.genre.toLowerCase()];
    const tmdb = getTmdbClient();
    if (!genreId || !tmdb) return { items: [], hasKey: Boolean(tmdb) };
    const res = await safeCall(() =>
      tmdb.discover.movie({ with_genres: String(genreId), sort_by: "popularity.desc", language: "en-US", page: 1 }),
    );
    return { items: (res?.results ?? []) as TmdbMovie[], hasKey: Boolean(tmdb) };
  });

export const searchTmdb = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ q: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.q.trim()) return { items: [] };
    const tmdb = getTmdbClient();
    if (!tmdb) return { items: [] };
    const res = await safeCall(() =>
      tmdb.search.movies({ query: data.q, include_adult: false, language: "en-US", page: 1 }),
    );
    return { items: (res?.results ?? []) as TmdbMovie[] };
  });