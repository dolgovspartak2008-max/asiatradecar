"use client";

import { useRef, useState } from "react";

export function VideoHero() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const toggle = () => {
    if (!ref.current) return;
    if (ref.current.paused) void ref.current.play(); else ref.current.pause();
    setPlaying(!ref.current.paused);
  };
  return <div className="hero-media" aria-label="Автомобиль в движении">
    <video ref={ref} autoPlay muted loop playsInline preload="metadata"><source src="/media/hero-drive.mp4" type="video/mp4" /></video>
    <div className="hero-shade" />
    <button className="video-toggle" type="button" onClick={toggle}>{playing ? "Пауза" : "Воспроизвести"}</button>
  </div>;
}
