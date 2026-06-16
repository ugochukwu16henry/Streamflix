import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { TMDB_IMG } from "@/lib/tmdb.functions";

export type CardItem = {
  type: "tmdb" | "upload";
  id: string;
  title: string;
  poster: string | null;
  year?: string | null;
  rating?: number | null;
};

export function posterUrl(item: { type: "tmdb" | "upload"; poster: string | null }, size: "w342" | "w500" = "w342") {
  if (!item.poster) return null;
  if (item.type === "tmdb") return `${TMDB_IMG}/${size}${item.poster}`;
  return item.poster;
}

export function MovieCard({ item }: { item: CardItem }) {
  const url = posterUrl(item);
  return (
    <Link
      to="/title/$type/$id"
      params={{ type: item.type, id: item.id }}
      className="group relative flex-shrink-0 w-[180px] md:w-[220px] aspect-[2/3] rounded-md overflow-hidden bg-muted transition-transform duration-300 hover:scale-105 hover:z-10 hover:ring-2 hover:ring-primary"
    >
      {url ? (
        <img src={url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted p-4 text-center">
          <span className="font-display text-xl">{item.title}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded-full bg-primary p-1.5"><Play className="size-3 fill-current" /></div>
          {item.rating != null && (
            <span className="text-xs text-foreground/80">★ {item.rating.toFixed(1)}</span>
          )}
        </div>
        <p className="text-sm font-semibold line-clamp-2">{item.title}</p>
        {item.year && <p className="text-xs text-foreground/60">{item.year}</p>}
      </div>
    </Link>
  );
}