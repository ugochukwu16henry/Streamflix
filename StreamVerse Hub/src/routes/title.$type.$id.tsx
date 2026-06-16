import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { getMovie, TMDB_IMG, sampleStreamFor } from "@/lib/tmdb.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/title/$type/$id")({
  parseParams: (p) => {
    if (p.type !== "tmdb" && p.type !== "upload") throw notFound();
    return { type: p.type as "tmdb" | "upload", id: p.id };
  },
  head: () => ({ meta: [{ title: "Title — StreamFlix" }] }),
  component: TitlePage,
});

function TitlePage() {
  const { type, id } = Route.useParams();
  return type === "tmdb" ? <TmdbTitle id={id} /> : <UploadTitle id={id} />;
}

function TmdbTitle({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => getMovie({ data: { id } }),
  });

  if (isLoading) return <div className="pt-32 text-center">Loading…</div>;
  if (!data) return <NoKeyTitle id={id} />;

  const m = data as {
    id: number;
    title: string;
    overview: string;
    backdrop_path: string | null;
    poster_path: string | null;
    release_date: string | null;
    runtime: number;
    vote_average: number;
    genres: { id: number; name: string }[];
  };

  return (
    <TitleLayout
      title={m.title}
      overview={m.overview}
      backdrop={m.backdrop_path ? `${TMDB_IMG}/original${m.backdrop_path}` : null}
      meta={[m.release_date?.slice(0, 4), m.runtime ? `${m.runtime} min` : null, `★ ${m.vote_average?.toFixed(1)}`].filter(Boolean) as string[]}
      genres={m.genres?.map((g) => g.name) ?? []}
      playLink={{ type: "tmdb", id: String(m.id) }}
      saveItem={{ contentType: "tmdb", contentId: String(m.id), title: m.title, poster: m.poster_path ? `${TMDB_IMG}/w342${m.poster_path}` : null }}
    />
  );
}

function NoKeyTitle({ id }: { id: string }) {
  return (
    <div className="pt-32 text-center">
      <p className="text-muted-foreground mb-4">Add a TMDB API key to load metadata for movie #{id}.</p>
      <Link to="/" className="text-primary underline">Back home</Link>
    </div>
  );
}

function UploadTitle({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, genre, poster_url, video_url, view_count, created_at, uploader_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="pt-32 text-center">Loading…</div>;
  if (!data) return <div className="pt-32 text-center">Video not found.</div>;

  return (
    <TitleLayout
      title={data.title}
      overview={data.description ?? ""}
      backdrop={data.poster_url}
      meta={[
        new Date(data.created_at).getFullYear().toString(),
        data.genre ?? undefined,
        `${data.view_count} views`,
      ].filter(Boolean) as string[]}
      genres={data.genre ? [data.genre] : []}
      playLink={{ type: "upload", id: data.id }}
      saveItem={{ contentType: "upload", contentId: data.id, title: data.title, poster: data.poster_url }}
    />
  );
}

function TitleLayout({
  title,
  overview,
  backdrop,
  meta,
  genres,
  playLink,
  saveItem,
}: {
  title: string;
  overview: string;
  backdrop: string | null;
  meta: string[];
  genres: string[];
  playLink: { type: "tmdb" | "upload"; id: string };
  saveItem: { contentType: "tmdb" | "upload"; contentId: string; title: string; poster: string | null };
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const saved = useQuery({
    queryKey: ["watchlist", saveItem.contentType, saveItem.contentId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("watchlist")
        .select("user_id")
        .eq("user_id", user!.id)
        .eq("content_type", saveItem.contentType)
        .eq("content_id", saveItem.contentId)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleSaved = async () => {
    if (!user) return toast.error("Sign in to save titles");
    if (saved.data) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("content_type", saveItem.contentType)
        .eq("content_id", saveItem.contentId);
      toast.success("Removed from My List");
    } else {
      await supabase.from("watchlist").insert({
        user_id: user.id,
        content_type: saveItem.contentType,
        content_id: saveItem.contentId,
      });
      toast.success("Added to My List");
    }
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  };

  return (
    <main>
      <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        {backdrop ? (
          <img src={backdrop} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative h-full max-w-4xl flex flex-col justify-end pb-16 px-6 md:px-12">
          <h1 className="font-display text-5xl md:text-7xl mb-4 tracking-wide">{title}</h1>
          <div className="flex items-center gap-3 mb-4 text-sm text-foreground/80">
            {meta.map((m, i) => <span key={i}>{m}</span>)}
          </div>
          <p className="text-base md:text-lg text-foreground/90 max-w-2xl mb-6">{overview}</p>
          <div className="flex gap-3">
            <Link
              to="/watch/$type/$id"
              params={{ type: playLink.type, id: playLink.id }}
              className="flex items-center gap-2 rounded-md bg-foreground text-background px-6 py-2.5 font-semibold hover:bg-foreground/80"
            >
              <Play className="size-5 fill-current" /> Play
            </Link>
            <Button onClick={toggleSaved} variant="secondary" className="gap-2">
              {saved.data ? <Check className="size-5" /> : <Plus className="size-5" />}
              {saved.data ? "In My List" : "My List"}
            </Button>
          </div>
          {genres.length > 0 && (
            <div className="mt-4 flex gap-2 text-xs text-muted-foreground">
              {genres.map((g) => (
                <span key={g} className="rounded-full border border-border px-2 py-0.5">{g}</span>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// re-export for use in watch route's fallback play
export { sampleStreamFor };