import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Upload as UploadIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Animation", "Documentary"];

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload Video — StreamFlix" }] }),
  component: UploadPage,
});

function UploadPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error("Add a title");
    if (!videoFile) return toast.error("Choose a video file");
    setUploading(true);
    try {
      const ext = videoFile.name.split(".").pop() || "mp4";
      const videoPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      setProgress(10);
      const { error: vErr } = await supabase.storage.from("videos").upload(videoPath, videoFile, {
        cacheControl: "3600",
        contentType: videoFile.type || "video/mp4",
      });
      if (vErr) throw vErr;
      setProgress(70);

      let posterStoredUrl: string | null = null;
      if (posterFile) {
        const pExt = posterFile.name.split(".").pop() || "jpg";
        const posterPath = `${user.id}/${crypto.randomUUID()}.${pExt}`;
        const { error: pErr } = await supabase.storage.from("posters").upload(posterPath, posterFile, {
          cacheControl: "3600",
          contentType: posterFile.type || "image/jpeg",
        });
        if (pErr) throw pErr;
        posterStoredUrl = `storage:posters/${posterPath}`;
      }
      setProgress(90);

      const { error: insertErr } = await supabase.from("videos").insert({
        uploader_id: user.id,
        title,
        description: description || null,
        genre: genre || null,
        poster_url: posterStoredUrl,
        video_url: `storage:videos/${videoPath}`,
        is_published: true,
      });
      if (insertErr) throw insertErr;
      setProgress(100);
      toast.success("Video uploaded!");
      navigate({ to: "/studio" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="pt-24 pb-20 px-6 md:px-12 max-w-2xl mx-auto">
      <h1 className="font-display text-4xl mb-2">Upload a Video</h1>
      <p className="text-muted-foreground mb-8">
        Share your work with the world. We accept MP4 and WebM. Bigger files take longer.
      </p>

      <div className="space-y-5">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1.5" />
        </div>
        <div>
          <Label>Genre</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick a genre" /></SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Video file</Label>
          <Input
            type="file"
            accept="video/mp4,video/webm,video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Poster image (optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
            className="mt-1.5"
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">Uploading… {progress}%</p>
          </div>
        )}

        <Button onClick={submit} disabled={uploading} className="w-full bg-primary hover:bg-primary/90 gap-2">
          <UploadIcon className="size-4" /> Publish
        </Button>
      </div>
    </main>
  );
}