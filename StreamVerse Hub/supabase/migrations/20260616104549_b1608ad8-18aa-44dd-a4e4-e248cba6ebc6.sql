
-- Tighten video_views insert policy
DROP POLICY IF EXISTS "Anyone can record a view" ON public.video_views;
CREATE POLICY "Anyone can record a view" ON public.video_views FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Lock down increment function to enforce same rule and remove SECURITY DEFINER ambiguity
DROP FUNCTION IF EXISTS public.increment_video_view(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.increment_video_view(_video_id UUID, _watched_seconds INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  INSERT INTO public.video_views (video_id, user_id, watched_seconds)
  VALUES (_video_id, auth.uid(), GREATEST(COALESCE(_watched_seconds, 0), 0));
  UPDATE public.videos SET view_count = view_count + 1 WHERE id = _video_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_video_view(UUID, INTEGER) TO anon, authenticated;

-- Storage policies: videos bucket
CREATE POLICY "Videos are readable by anyone" ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');
CREATE POLICY "Authenticated users can upload videos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can update their video files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can delete their video files" ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies: posters bucket
CREATE POLICY "Posters are readable by anyone" ON storage.objects FOR SELECT
  USING (bucket_id = 'posters');
CREATE POLICY "Authenticated users can upload posters" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'posters' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can update their poster files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'posters' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can delete their poster files" ON storage.objects FOR DELETE
  USING (bucket_id = 'posters' AND auth.uid()::text = (storage.foldername(name))[1]);
