"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function GlobalJourney() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = root.current;
    const path = layer?.querySelector<SVGPathElement>("#global-route-path");
    const progressPath = layer?.querySelector<SVGPathElement>("#global-route-progress");
    const car = layer?.querySelector<SVGGElement>("#global-route-car");
    if (!layer || !path || !progressPath || !car) return;
    const length = path.getTotalLength();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let previousScroll = scrollY;
    let reversing = false;

    const render = () => {
      frame = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const hero = pathname === "/" ? document.querySelector<HTMLElement>(".hero") : null;
      const start = hero?.offsetHeight ?? 0;
      const atEnd = maxScroll - scrollY <= 1;
      const progress = reduced || atEnd ? 1 : Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, maxScroll - start)));
      const distance = length * progress;
      const point = path.getPointAtLength(distance);
      const before = path.getPointAtLength(Math.max(0, distance - 3));
      const after = path.getPointAtLength(Math.min(length, distance + 3));
      if (scrollY !== previousScroll) reversing = scrollY < previousScroll;
      previousScroll = scrollY;
      const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + (reversing ? 180 : 0);
      car.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
      progressPath.style.strokeDasharray = String(length);
      progressPath.style.strokeDashoffset = String(length - distance);
      layer.classList.toggle("journey-started", progress > 0);
      layer.classList.toggle("journey-finished", progress >= .9999);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    render();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    return () => { removeEventListener("scroll", schedule); removeEventListener("resize", schedule); observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [pathname]);

  return <div ref={root} className={`global-journey ${pathname === "/" ? "global-journey-home" : ""}`} aria-hidden="true">
    <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="journey-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8d3c7"/><stop offset="1" stopColor="#bbb4a5"/></linearGradient><filter id="car-shadow"><feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity=".35"/></filter></defs>
      <path className="russia-outline" d="M65 270 128 213l68 12 51-56 76 18 62-72 106 45 58-34 75 36 89-13 67 53 70-8 58 45 101 9 55 64-29 69 42 50-61 42-83-17-48 30-84-9-65 42-109-27-72 18-73-40-89 15-41-51-81 7-45-62-78-28-18-51Z"/>
      <path className="map-river" d="M167 300c160 70 230-45 360 12s214-9 420 75"/><path className="map-river" d="M386 184c16 91 79 128 69 231"/>
      <path id="global-route-path" className="journey-route-base" d="M1080 620C1012 548 952 500 914 425S805 329 720 345 603 449 511 417 391 309 300 330 205 441 108 405"/>
      <path id="global-route-progress" className="journey-route-progress" d="M1080 620C1012 548 952 500 914 425S805 329 720 345 603 449 511 417 391 309 300 330 205 441 108 405"/>
      <g className="journey-city"><circle cx="1080" cy="620" r="8"/><text x="1080" y="652">Корея</text></g><g className="journey-city"><circle cx="914" cy="425" r="8"/><text x="914" y="405">Владивосток</text></g><g className="journey-city"><circle cx="511" cy="417" r="8"/><text x="511" y="397">Екатеринбург</text></g><g className="journey-city"><circle cx="108" cy="405" r="8"/><text x="108" y="385">Москва</text></g>
      <g id="global-route-car" className="journey-car" transform="translate(1080 620)" filter="url(#car-shadow)"><path className="car-body" d="M-28-13C-24-24-16-31 0-33 16-31 24-24 28-13l3 35c0 8-6 14-14 14h-34c-8 0-14-6-14-14Z"/><path className="car-glass" d="M-17-11c3-9 8-14 17-16 9 2 14 7 17 16l-4 9h-26Z"/><path className="car-glass" d="m-17 4 4 18h26l4-18Z"/><rect x="-34" y="-12" width="7" height="15" rx="3"/><rect x="27" y="-12" width="7" height="15" rx="3"/><rect x="-34" y="17" width="7" height="14" rx="3"/><rect x="27" y="17" width="7" height="14" rx="3"/><path className="car-light" d="m-22-15 8-8M22-15l-8-8"/></g>
    </svg>
    <div className="journey-label"><span>Маршрут доставки</span><b>Корея → Россия</b></div>
  </div>;
}
