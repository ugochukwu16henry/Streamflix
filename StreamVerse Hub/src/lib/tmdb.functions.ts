import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

// Public sample HLS streams paired by index with TMDB ids (so detail/play pages have something to play).
const SAMPLE_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
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

async function tmdbFetch(path: string, params: Record<string, string> = {}): Promise<{ results: TmdbMovie[] } | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as { results: TmdbMovie[] };
  } catch {
    return null;
  }
}

export const getHomeRows = createServerFn({ method: "GET" }).handler(async () => {
  const hasKey = Boolean(process.env.TMDB_API_KEY);
  if (!hasKey) {
    return { hasKey, rows: [], hero: null as TmdbMovie | null };
  }
  const [trending, top, popular, action, comedy, horror] = await Promise.all([
    tmdbFetch("/trending/movie/week"),
    tmdbFetch("/movie/top_rated"),
    tmdbFetch("/movie/popular"),
    tmdbFetch("/discover/movie", { with_genres: String(GENRE_MAP.action) }),
    tmdbFetch("/discover/movie", { with_genres: String(GENRE_MAP.comedy) }),
    tmdbFetch("/discover/movie", { with_genres: String(GENRE_MAP.horror) }),
  ]);
  const rows = [
    { id: "trending", title: "Trending Now", items: trending?.results ?? [] },
    { id: "top", title: "Top Rated", items: top?.results ?? [] },
    { id: "popular", title: "Popular on StreamFlix", items: popular?.results ?? [] },
    { id: "action", title: "Action & Adventure", items: action?.results ?? [] },
    { id: "comedy", title: "Laugh Out Loud", items: comedy?.results ?? [] },
    { id: "horror", title: "Spine-Chilling Horror", items: horror?.results ?? [] },
  ];
  const heroPool = trending?.results?.filter((m) => m.backdrop_path) ?? [];
  const hero = heroPool[Math.floor(Math.random() * Math.min(5, heroPool.length))] ?? null;
  return { hasKey, rows, hero };
});

export const getMovie = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.TMDB_API_KEY;
    if (!key) return null;
    try {
      const res = await fetch(`${BASE}/movie/${data.id}?api_key=${key}&language=en-US`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  });

export const getGenreMovies = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ genre: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const genreId = GENRE_MAP[data.genre.toLowerCase()];
    if (!genreId) return { items: [], hasKey: Boolean(process.env.TMDB_API_KEY) };
    const res = await tmdbFetch("/discover/movie", { with_genres: String(genreId), sort_by: "popularity.desc" });
    return { items: res?.results ?? [], hasKey: Boolean(process.env.TMDB_API_KEY) };
  });

export const searchTmdb = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ q: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.q.trim()) return { items: [] };
    const res = await tmdbFetch("/search/movie", { query: data.q });
    return { items: res?.results ?? [] };
  });