import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, Upload, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Creator Studio — StreamFlix" }] }),
  component: StudioPage,
});

const RATE_PER_VIEW = 0.002; // $0.002 per view, indicative

function StudioPage() {
  const { user } = Route.useRouteContext();

  const { data, isLoading } = useQuery({
    queryKey: ["studio", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, view_count, created_at, is_published, poster_url")
        .eq("uploader_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalViews = (data ?? []).reduce((s, v) => s + Number(v.view_count ?? 0), 0);
  const earnings = totalViews * RATE_PER_VIEW;

  return (
    <main className="pt-24 pb-20 px-6 md:px-12 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Creator Studio</h1>
          <p className="text-muted-foreground">Track your videos and projected earnings.</p>
        </div>
        <Link to="/upload">
          <Button className="bg-primary hover:bg-primary/90 gap-2">
            <Upload className="size-4" /> Upload new video
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Stat label="Videos" value={(data?.length ?? 0).toString()} />
        <Stat label="Total views" value={totalViews.toLocaleString()} icon={<Eye className="size-5" />} />
        <Stat label="Projected earnings" value={`$${earnings.toFixed(2)}`} icon={<DollarSign className="size-5" />} hint="Payouts coming soon" />
      </div>

      <h2 className="font-display text-2xl mb-4">Your videos</h2>
      {isLoading ? (
        <p>Loading…</p>
      ) : data && data.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to="/title/$type/$id" params={{ type: "upload", id: v.id }} className="hover:text-primary">
                      {v.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={v.is_published ? "text-green-500" : "text-muted-foreground"}>
                      {v.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{Number(v.view_count).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">${(Number(v.view_count) * RATE_PER_VIEW).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No videos yet.</p>
          <Link to="/upload">
            <Button className="bg-primary hover:bg-primary/90">Upload your first video</Button>
          </Link>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, icon, hint }: { label: string; value: string; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}