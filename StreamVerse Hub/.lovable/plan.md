# StreamFlix — v1 Plan

A Netflix-style streaming web app with a TMDB-powered movie catalog, user accounts with a personal watchlist, and creator uploads that play via HLS. Monetization (per-view payouts via Stripe Connect) is intentionally deferred to v2 so v1 ships solid.

## What we're building

1. **Browse & stream catalog** — Netflix-style home with hero billboard, horizontal rows (Trending, Top Rated, Action, etc.), movie detail pages, search, and an HLS video player. Metadata + posters from TMDB; playback uses public sample HLS streams (TMDB does not host video).
2. **Auth + profiles + watchlist** — Email/password and Google sign-in via Lovable Cloud. "My List" (add/remove), "Continue Watching" (resume position).
3. **Creator uploads** — Signed-in users upload a video file + poster + title/description/genre. File stored in Lovable Cloud storage. Plays in the same player. Creator videos appear in their own row on the home page and in search alongside TMDB titles. View counts tracked (groundwork for v2 payouts).

## Pages / routes

```text
/                       Home: hero + rows (TMDB + creator uploads)
/browse/$genre          Genre grid
/search                 Search across TMDB + creator videos
/title/$id              Movie detail + play
/watch/$id              Fullscreen player
/_authenticated/
  my-list               Saved titles
  upload                Creator upload form
  studio                Creator's own videos + view counts
/auth                   Sign in / sign up
```

## Design

Netflix-style: near-black background, red accent (#E50914), bold sans (Bebas Neue display + Inter body), edge-to-edge hero with gradient fade, horizontal scrolling rows with hover-scale cards, sticky transparent-to-solid top nav.

## Data model (Lovable Cloud / Postgres)

- `profiles` — id (= auth.users.id), display_name, avatar_url, is_creator
- `videos` — id, uploader_id, title, description, genre, poster_url, video_url (HLS or MP4), duration_seconds, view_count, created_at
- `watchlist` — user_id, content_type ('tmdb' | 'upload'), content_id, added_at
- `watch_progress` — user_id, content_type, content_id, position_seconds, updated_at
- `video_views` — id, video_id, user_id (nullable), watched_seconds, created_at  *(feeds v2 payouts)*

RLS: profiles/watchlist/watch_progress scoped to `auth.uid()`. Videos: public SELECT, owner-only UPDATE/DELETE, authenticated INSERT. Storage bucket `videos` (public read) + `posters` (public read), owner-only write.

## Technical details

- **Stack**: React + TanStack Start + Tailwind v4 + shadcn/ui + Lovable Cloud (Supabase under the hood). Same single project — no separate Node/Django backend or VPS.
- **TMDB calls** go through a `createServerFn` so the API key stays server-side. Scaffold renders skeleton/empty rows until the key is added via the secrets flow (`TMDB_API_KEY`).
- **Video player**: `hls.js` for adaptive HLS playback, native `<video>` fallback for MP4.
- **Uploads**: Direct browser upload to Cloud storage (chunked, with progress). No server-side transcoding in v1 — accept MP4/WebM as-is and store the original. Note: full HLS transcoding (FFmpeg) needs a dedicated worker and is out of scope for v1; we'll add it when monetization lands.
- **View tracking**: When the player passes 30s of watch time, insert a `video_views` row and increment `videos.view_count` via an RPC.
- **Search**: TMDB `/search/movie` + Postgres `ilike` on `videos.title`, merged client-side.

## Out of scope for v1 (call out explicitly)

- Stripe Connect payouts to creators (needs Stripe onboarding, view→earnings formula, payout schedule). Plan to add after v1 ships.
- Server-side HLS transcoding with FFmpeg (Cloudflare Worker runtime can't run FFmpeg; needs an external worker or Mux/Cloudflare Stream).
- Admin moderation queue for uploads.
- Subtitles, multiple audio tracks, DRM.

## Build order

1. Enable Lovable Cloud, create schema + storage buckets + RLS.
2. Design system (colors, fonts, layout shell, top nav).
3. Home page with TMDB rows (server fn + skeletons until key arrives).
4. Title detail + HLS player + watch progress.
5. Auth pages + My List + Continue Watching row.
6. Creator upload flow + Studio page + view tracking.
7. Search.

After you approve, I'll start with step 1 and ask for the TMDB key partway through step 3.
