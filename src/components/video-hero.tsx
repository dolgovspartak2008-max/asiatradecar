"use client";

import { useEffect, useRef, useState } from "react";

export function VideoHero() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!video.current) return;
      if (media.matches) {
        video.current.pause();
        setPlaying(false);
      } else {
        void video.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const toggle = () => {
    if (!video.current) return;
    if (video.current.paused) void video.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { video.current.pause(); setPlaying(false); }
  };

  return <div className="hero-media" aria-label="Автомобиль едет по горной дороге">
    <video className="hero-video" ref={video} autoPlay muted playsInline loop preload="metadata" poster="/media/hero-import.webp"><source src="/media/hero-drive.mp4" type="video/mp4" />Ваш браузер не поддерживает фоновое видео.</video>
    <div className="hero-shade" />
    <button className="hero-video-toggle" type="button" onClick={toggle} aria-label={playing ? "Остановить фоновое видео" : "Включить фоновое видео"}>{playing ? "Пауза" : "Включить"}</button>
  </div>;
}
