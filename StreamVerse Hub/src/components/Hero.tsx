import { Link } from "@tanstack/react-router";
import { Play, Info } from "lucide-react";
import { TMDB_IMG } from "@/lib/tmdb.functions";

type HeroProps = {
  id: number | string;
  type?: "tmdb" | "upload";
  title: string;
  overview: string;
  backdrop_path?: string | null;
  backdrop_url?: string | null;
};

export function Hero({ id, type = "tmdb", title, overview, backdrop_path, backdrop_url }: HeroProps) {
  const bg = backdrop_url ?? (backdrop_path ? `${TMDB_IMG}/original${backdrop_path}` : null);
  return (
    <section className="relative h-[85vh] min-h-[520px] w-full overflow-hidden">
      {bg ? (
        <img src={bg} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-background" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      <div className="relative h-full flex flex-col justify-end pb-24 px-6 md:px-12 max-w-3xl">
        <h1 className="font-display text-5xl md:text-7xl tracking-wide mb-4 drop-shadow-xl">{title}</h1>
        <p className="text-base md:text-lg text-foreground/90 line-clamp-3 mb-6 drop-shadow-lg">{overview}</p>
        <div className="flex gap-3">
          <Link
            to="/watch/$type/$id"
            params={{ type, id: String(id) }}
            className="flex items-center gap-2 rounded-md bg-foreground text-background px-6 py-2.5 font-semibold hover:bg-foreground/80"
          >
            <Play className="size-5 fill-current" /> Play
          </Link>
          <Link
            to="/title/$type/$id"
            params={{ type, id: String(id) }}
            className="flex items-center gap-2 rounded-md bg-secondary/80 backdrop-blur px-6 py-2.5 font-semibold hover:bg-secondary"
          >
            <Info className="size-5" /> More Info
          </Link>
        </div>
      </div>
    </section>
  );
}