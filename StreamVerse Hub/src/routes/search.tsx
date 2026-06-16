import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { searchTmdb } from "@/lib/tmdb.functions";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/MovieCard";
import { tmdbToCard, uploadToCard } from "@/lib/cards";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — StreamFlix" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");

  const tmdb = useQuery({
    queryKey: ["search", "tmdb", q],
    enabled: q.length > 1,
    queryFn: () => searchTmdb({ data: { q } }),
  });
  const uploads = useQuery({
    queryKey: ["search", "uploads", q],
    enabled: q.length > 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, poster_url, created_at")
        .ilike("title", `%${q}%`)
        .eq("is_published", true)
        .limit(30);
      return data ?? [];
    },
  });

  const results = [
    ...(uploads.data ?? []).map(uploadToCard),
    ...(tmdb.data?.items ?? []).map(tmdbToCard),
  ];

  return (
    <main className="pt-24 pb-20 px-6 md:px-12">
      <div className="max-w-2xl mx-auto mb-10">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search movies and creator videos"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>
      {q.length < 2 ? (
        <p className="text-center text-muted-foreground">Start typing to search.</p>
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground">No results yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((item) => (
            <MovieCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}