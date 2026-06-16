import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hero } from "@/components/Hero";
import { MovieRow } from "@/components/MovieRow";
import { Skeleton } from "@/components/ui/skeleton";
import { getHomeRows } from "@/lib/tmdb.functions";
import { supabase } from "@/integrations/supabase/client";
import { tmdbToCard, uploadToCard } from "@/lib/cards";
import type { CardItem } from "@/components/MovieCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamFlix — Watch Movies & Creator Videos" },
      { name: "description", content: "Endless movies, plus videos uploaded by creators around the world. Stream now on StreamFlix." },
      { property: "og:title", content: "StreamFlix" },
      { property: "og:description", content: "Endless movies, plus videos uploaded by creators around the world." },
    ],
  }),
  component: Home,
  errorComponent: ({ error }) => <div className="pt-24 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="pt-24 text-center">Nothing here.</div>,
});

function Home() {
  const tmdb = useQuery({
    queryKey: ["tmdb", "home"],
    queryFn: () => getHomeRows(),
  });

  const uploads = useQuery({
    queryKey: ["uploads", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, poster_url, created_at, description, video_url, view_count")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const hero = tmdb.data?.hero;
  const featuredUpload = uploads.data?.[0];

  return (
    <main>
      {hero ? (
        <Hero
          id={hero.id}
          type="tmdb"
          title={hero.title}
          overview={hero.overview}
          backdrop_path={hero.backdrop_path}
        />
      ) : featuredUpload ? (
        <Hero
          id={featuredUpload.id}
          type="upload"
          title={featuredUpload.title}
          overview={featuredUpload.description ?? "A creator-uploaded video."}
          backdrop_url={featuredUpload.poster_url}
        />
      ) : (
        <NoKeyHero />
      )}

      <div className="-mt-20 relative z-10 pb-20">
        {uploads.data && uploads.data.length > 0 && (
          <MovieRow
            title="Fresh from Creators"
            items={uploads.data.map(uploadToCard) as CardItem[]}
          />
        )}

        {tmdb.isLoading ? (
          <RowSkeletons />
        ) : tmdb.data?.hasKey ? (
          tmdb.data.rows.map((row) => (
            <MovieRow key={row.id} title={row.title} items={row.items.map(tmdbToCard)} />
          ))
        ) : (
          <NeedsKeyCallout />
        )}
      </div>
    </main>
  );
}

function NoKeyHero() {
  return (
    <section className="relative h-[70vh] min-h-[480px] flex items-end overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-background" />
      <div className="relative px-6 md:px-12 pb-24 max-w-3xl">
        <h1 className="font-display text-5xl md:text-7xl tracking-wide mb-4">Welcome to StreamFlix</h1>
        <p className="text-lg text-foreground/80 mb-6">
          Add a free TMDB API key to unlock the movie catalog, or sign up and upload your own video to get started.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-semibold hover:opacity-90"
        >
          Get started
        </Link>
      </div>
    </section>
  );
}

function NeedsKeyCallout() {
  return (
    <section className="px-6 md:px-12 py-12">
      <div className="rounded-lg border border-border bg-card/50 p-8 text-center">
        <h3 className="font-display text-2xl mb-2">Catalog ready when you are</h3>
        <p className="text-muted-foreground mb-4">
          Add a free TMDB API key (in project secrets as <code className="text-primary">TMDB_API_KEY</code>) to populate this page with thousands of titles.
        </p>
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          Get a free key →
        </a>
      </div>
    </section>
  );
}

function RowSkeletons() {
  return (
    <div className="space-y-10">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <Skeleton className="mx-6 md:mx-12 h-7 w-48 mb-3" />
          <div className="flex gap-3 px-6 md:px-12 overflow-hidden">
            {[...Array(8)].map((_, j) => (
              <Skeleton key={j} className="w-[180px] md:w-[220px] aspect-[2/3] rounded-md flex-shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
