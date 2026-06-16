import type { CardItem } from "@/components/MovieCard";
import type { TmdbMovie } from "./tmdb.functions";

export function tmdbToCard(m: TmdbMovie): CardItem {
  return {
    type: "tmdb",
    id: String(m.id),
    title: m.title,
    poster: m.poster_path,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
  };
}

export function uploadToCard(v: {
  id: string;
  title: string;
  poster_url: string | null;
  created_at: string;
}): CardItem {
  return {
    type: "upload",
    id: v.id,
    title: v.title,
    poster: v.poster_url,
    year: v.created_at.slice(0, 4),
    rating: null,
  };
}