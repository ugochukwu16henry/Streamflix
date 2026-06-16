import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getGenreMovies } from "@/lib/tmdb.functions";
import { MovieCard } from "@/components/MovieCard";
import { tmdbToCard } from "@/lib/cards";

export const Route = createFileRoute("/browse/$genre")({
  head: ({ params }) => ({
    meta: [
      { title: `${cap(params.genre)} Movies — StreamFlix` },
      { name: "description", content: `Stream the best ${params.genre} movies on StreamFlix.` },
    ],
  }),
  component: BrowseGenre,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function BrowseGenre() {
  const { genre } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["genre", genre],
    queryFn: () => getGenreMovies({ data: { genre } }),
  });

  return (
    <main className="pt-24 pb-20 px-6 md:px-12">
      <h1 className="font-display text-4xl md:text-5xl mb-8">{cap(genre)}</h1>
      {!data?.hasKey && (
        <p className="text-muted-foreground mb-6">
          Add a TMDB API key to populate this page.{" "}
          <Link to="/" className="text-primary underline">Back home</Link>
        </p>
      )}
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(data?.items ?? []).map((m) => (
            <MovieCard key={m.id} item={tmdbToCard(m)} />
          ))}
        </div>
      )}
    </main>
  );
}