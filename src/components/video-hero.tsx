"use client";

import { useEffect, useRef, useState } from "react";

export function VideoHero() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!ref.current) return;
      if (media.matches) { ref.current.pause(); setPlaying(false); }
      else { void ref.current.play(); setPlaying(true); }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const toggle = async () => {
    if (!ref.current) return;
    if (ref.current.paused) {
      try { await ref.current.play(); setPlaying(true); } catch { setPlaying(false); }
    } else {
      ref.current.pause();
      setPlaying(false);
    }
  };
  return <div className={`hero-media ${playing ? "is-playing" : ""}`} aria-label="Автомобиль едет по горной дороге">
    <video ref={ref} autoPlay muted loop playsInline preload="metadata"><source src="/media/hero-drive.mp4" type="video/mp4" /></video>
    <div className="hero-motion-lines" aria-hidden="true"><i/><i/><i/></div>
    <div className="hero-shade" />
    <button className="video-toggle" type="button" onClick={toggle} aria-label={playing ? "Остановить движение автомобиля" : "Запустить движение автомобиля"}>{playing ? "Пауза" : "Воспроизвести"}</button>
  </div>;
}
