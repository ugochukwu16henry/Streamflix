
-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  is_creator BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Videos (creator uploads)
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  poster_url TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER,
  view_count BIGINT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published videos are viewable by everyone" ON public.videos FOR SELECT USING (is_published = true OR auth.uid() = uploader_id);
CREATE POLICY "Authenticated users can upload videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Owners can update their videos" ON public.videos FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "Owners can delete their videos" ON public.videos FOR DELETE USING (auth.uid() = uploader_id);
CREATE INDEX videos_uploader_idx ON public.videos(uploader_id);
CREATE INDEX videos_genre_idx ON public.videos(genre);
CREATE INDEX videos_created_idx ON public.videos(created_at DESC);

-- Watchlist
CREATE TABLE public.watchlist (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('tmdb','upload')),
  content_id TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_type, content_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Watch progress
CREATE TABLE public.watch_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('tmdb','upload')),
  content_id TEXT NOT NULL,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  title TEXT,
  poster_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_type, content_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.watch_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Video views (for future monetization)
CREATE TABLE public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.video_views TO authenticated;
GRANT SELECT, INSERT ON public.video_views TO anon;
GRANT ALL ON public.video_views TO service_role;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a view" ON public.video_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Uploaders can read their video views" ON public.video_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_views.video_id AND v.uploader_id = auth.uid())
);
CREATE INDEX video_views_video_idx ON public.video_views(video_id);

-- RPC: increment view count
CREATE OR REPLACE FUNCTION public.increment_video_view(_video_id UUID, _watched_seconds INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.video_views (video_id, user_id, watched_seconds)
  VALUES (_video_id, auth.uid(), GREATEST(_watched_seconds, 0));
  UPDATE public.videos SET view_count = view_count + 1 WHERE id = _video_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_video_view(UUID, INTEGER) TO anon, authenticated;
