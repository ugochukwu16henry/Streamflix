import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getMovie, sampleStreamFor, TMDB_IMG } from "@/lib/tmdb.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/watch/$type/$id")({
  parseParams: (p) => {
    if (p.type !== "tmdb" && p.type !== "upload") throw notFound();
    return { type: p.type as "tmdb" | "upload", id: p.id };
  },
  head: () => ({ meta: [{ title: "Now Playing — StreamFlix" }] }),
  component: WatchPage,
});

function WatchPage() {
  const { type, id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewRecorded = useRef(false);

  const detail = useQuery({
    queryKey: ["watch", type, id],
    queryFn: async () => {
      if (type === "tmdb") {
        const m = await getMovie({ data: { id } });
        if (!m) {
          return {
            title: `Movie #${id}`,
            poster: null,
            src: sampleStreamFor(id),
            video_id: null as string | null,
          };
        }
        const tm = m as { title: string; backdrop_path: string | null };
        return {
          title: tm.title,
          poster: tm.backdrop_path ? `${TMDB_IMG}/w780${tm.backdrop_path}` : null,
          src: sampleStreamFor(id),
          video_id: null,
        };
      }
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, poster_url, video_url")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) throw new Error("Video not found");
      // Get signed URL for private bucket
      let src = data.video_url;
      if (src.startsWith("storage:videos/")) {
        const path = src.replace("storage:videos/", "");
        const { data: signed } = await supabase.storage.from("videos").createSignedUrl(path, 3600);
        if (signed?.signedUrl) src = signed.signedUrl;
      }
      let poster = data.poster_url;
      if (poster?.startsWith("storage:posters/")) {
        const path = poster.replace("storage:posters/", "");
        const { data: signed } = await supabase.storage.from("posters").createSignedUrl(path, 3600);
        poster = signed?.signedUrl ?? null;
      }
      return { title: data.title, poster, src, video_id: data.id };
    },
  });

  // load saved progress
  const progress = useQuery({
    queryKey: ["progress", type, id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("watch_progress")
        .select("position_seconds")
        .eq("user_id", user!.id)
        .eq("content_type", type)
        .eq("content_id", id)
        .maybeSingle();
      return data?.position_seconds ?? 0;
    },
  });

  const lastSavedRef = useRef(0);
  const onTime = async (currentTime: number, duration: number) => {
    // record a view once at 30s for uploads
    if (!viewRecorded.current && type === "upload" && detail.data?.video_id && currentTime >= 30) {
      viewRecorded.current = true;
      supabase.rpc("increment_video_view", {
        _video_id: detail.data.video_id,
        _watched_seconds: Math.floor(currentTime),
      });
    }
    // throttle progress save
    if (user && currentTime - lastSavedRef.current > 10) {
      lastSavedRef.current = currentTime;
      await supabase.from("watch_progress").upsert({
        user_id: user.id,
        content_type: type,
        content_id: id,
        position_seconds: Math.floor(currentTime),
        duration_seconds: Math.floor(duration || 0),
        title: detail.data?.title ?? "",
        poster_url: detail.data?.poster ?? null,
      });
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (detail.isLoading) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-foreground">Loading…</div>;
  }
  if (detail.error || !detail.data) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 text-foreground">
        <p>Couldn't load this title.</p>
        <Link to="/" className="text-primary underline">Back home</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-md bg-black/60 hover:bg-black/90 text-foreground"
      >
        <ArrowLeft className="size-5" /> Back
      </button>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-foreground/90 font-display text-xl">
        {detail.data.title}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <VideoPlayer
          src={detail.data.src}
          poster={detail.data.poster}
          startAt={progress.data ?? 0}
          onTimeUpdate={onTime}
        />
      </div>
    </div>
  );
}