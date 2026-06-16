import { useEffect, useRef } from "react";
import Hls from "hls.js";

type Props = {
  src: string;
  poster?: string | null;
  startAt?: number;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: (duration: number) => void;
};

export function VideoPlayer({ src, poster, startAt, autoPlay = true, onTimeUpdate, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    const isHls = /\.m3u8($|\?)/i.test(src);

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    const onLoaded = () => {
      if (startAt && startAt > 5 && Number.isFinite(video.duration) && startAt < video.duration - 5) {
        video.currentTime = startAt;
      }
      onReady?.(video.duration);
    };
    const onTime = () => onTimeUpdate?.(video.currentTime, video.duration);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      if (hls) hls.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster ?? undefined}
      controls
      autoPlay={autoPlay}
      playsInline
      className="w-full h-full bg-black"
    />
  );
}