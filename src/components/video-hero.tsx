"use client";

import { useEffect, useRef } from "react";

export function VideoHero() {
  const refs = useRef<Array<HTMLVideoElement | null>>([]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const videos = refs.current.filter((video): video is HTMLVideoElement => Boolean(video));
    let active = 0;
    let switching = false;
    let cleanupTimer = 0;

    const sync = () => {
      videos.forEach((video, index) => {
        if (media.matches) video.pause();
        else if (index === active) void video.play().catch(() => undefined);
      });
    };
    const crossfade = async () => {
      if (switching || media.matches) return;
      const current = videos[active];
      const nextIndex = active === 0 ? 1 : 0;
      const next = videos[nextIndex];
      if (!current || !next) return;
      switching = true;
      next.currentTime = 0;
      try {
        await next.play();
        current.classList.remove("is-front");
        current.classList.add("is-fading");
        next.classList.add("is-front");
        cleanupTimer = window.setTimeout(() => {
          current.pause();
          current.currentTime = 0;
          current.classList.remove("is-fading");
          active = nextIndex;
          switching = false;
        }, 900);
      } catch { switching = false; }
    };
    const checkSeam = () => {
      const current = videos[active];
      if (current?.duration && current.duration - current.currentTime < .95) void crossfade();
    };
    videos.forEach((video) => video.addEventListener("timeupdate", checkSeam));
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      videos.forEach((video) => { video.removeEventListener("timeupdate", checkSeam); video.pause(); });
      clearTimeout(cleanupTimer);
    };
  }, []);

  return <div className="hero-media" aria-label="Автомобиль едет по горной дороге">
    {[0, 1].map((index) => <video className={`hero-video ${index === 0 ? "is-front" : ""}`} ref={(node) => { refs.current[index] = node; }} autoPlay={index === 0} muted playsInline preload="auto" poster="/media/hero-import.png" key={index}><source src="/media/hero-drive.mp4" type="video/mp4" />Ваш браузер не поддерживает фоновое видео.</video>)}
    <div className="hero-shade" />
  </div>;
}
