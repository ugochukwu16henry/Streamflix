import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMovie, TMDB_IMG } from "@/lib/tmdb.functions";
import { MovieCard, type CardItem } from "@/components/MovieCard";

export const Route = createFileRoute("/_authenticated/my-list")({
  head: () => ({ meta: [{ title: "My List — StreamFlix" }] }),
  component: MyListPage,
});

function MyListPage() {
  const { user } = Route.useRouteContext();

  const continueWatching = useQuery({
    queryKey: ["continue", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("watch_progress")
        .select("content_type, content_id, title, poster_url, position_seconds, duration_seconds, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["watchlist", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("watchlist")
        .select("content_type, content_id, added_at")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });
      if (!data) return [];
      // Resolve each item
      const items: CardItem[] = await Promise.all(
        data.map(async (row) => {
          if (row.content_type === "tmdb") {
            const m: any = await getMovie({ data: { id: row.content_id } });
            return {
              type: "tmdb",
              id: row.content_id,
              title: m?.title ?? `Movie #${row.content_id}`,
              poster: m?.poster_path ?? null,
              year: m?.release_date?.slice(0, 4) ?? null,
              rating: m?.vote_average ?? null,
            };
          }
          const { data: v } = await supabase
            .from("videos")
            .select("id, title, poster_url, created_at")
            .eq("id", row.content_id)
            .maybeSingle();
          return {
            type: "upload",
            id: row.content_id,
            title: v?.title ?? "Untitled",
            poster: v?.poster_url ?? null,
            year: v?.created_at?.slice(0, 4) ?? null,
            rating: null,
          };
        }),
      );
      return items;
    },
  });

  return (
    <main className="pt-24 pb-20 px-6 md:px-12 space-y-12">
      <section>
        <h1 className="font-display text-4xl mb-6">Continue Watching</h1>
        {continueWatching.data && continueWatching.data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueWatching.data.map((row) => {
              const pct = row.duration_seconds ? Math.min(100, (row.position_seconds / row.duration_seconds) * 100) : 0;
              const poster =
                row.content_type === "tmdb" && row.poster_url?.startsWith("/")
                  ? `${TMDB_IMG}/w780${row.poster_url}`
                  : row.poster_url;
              return (
                <Link
                  key={`${row.content_type}-${row.content_id}`}
                  to="/watch/$type/$id"
                  params={{ type: row.content_type as "tmdb" | "upload", id: row.content_id }}
                  className="group relative aspect-video rounded-md overflow-hidden bg-muted"
                >
                  {poster ? (
                    <img src={poster} alt={row.title ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-background" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-4">
                    <p className="font-semibold">{row.title}</p>
                    <div className="mt-2 h-1 bg-foreground/20 rounded">
                      <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">Nothing in progress yet.</p>
        )}
      </section>

      <section>
        <h2 className="font-display text-3xl mb-6">My List</h2>
        {list.data && list.data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {list.data.map((item) => (
              <MovieCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Add titles from any movie page to see them here.</p>
        )}
      </section>
    </main>
  );
}