"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const car = <g className="journey-car-shape">
  <path className="car-body" d="M-28-13C-24-24-16-31 0-33 16-31 24-24 28-13l3 35c0 8-6 14-14 14h-34c-8 0-14-6-14-14Z"/>
  <path className="car-glass" d="M-17-11c3-9 8-14 17-16 9 2 14 7 17 16l-4 9h-26Z"/>
  <path className="car-glass" d="m-17 4 4 18h26l4-18Z"/>
  <rect x="-34" y="-12" width="7" height="15" rx="3"/><rect x="27" y="-12" width="7" height="15" rx="3"/>
  <rect x="-34" y="17" width="7" height="14" rx="3"/><rect x="27" y="17" width="7" height="14" rx="3"/>
  <path className="car-light" d="m-22-15 8-8M22-15l-8-8"/>
</g>;

export function GlobalJourney() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = root.current;
    const routeSets = layer ? Array.from(layer.querySelectorAll<SVGGElement>("[data-journey-route]")) : [];
    if (!layer || !routeSets.length) return;
    const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousScroll = scrollY;
    let reversing = false;

    const render = () => {
      frame = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const hero = pathname === "/" ? document.querySelector<HTMLElement>(".hero") : null;
      const start = hero?.offsetHeight ?? 0;
      const atEnd = maxScroll - scrollY <= 1;
      const progress = reducedQuery.matches ? 0 : atEnd ? 1 : Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, maxScroll - start)));
      if (scrollY !== previousScroll) reversing = scrollY < previousScroll;
      previousScroll = scrollY;

      routeSets.forEach((set) => {
        const path = set.querySelector<SVGPathElement>(".journey-route-base");
        const progressPath = set.querySelector<SVGPathElement>(".journey-route-progress");
        const movingCar = set.querySelector<SVGGElement>(".journey-car");
        if (!path || !progressPath || !movingCar) return;
        const length = path.getTotalLength();
        const distance = length * progress;
        const point = path.getPointAtLength(distance);
        const before = path.getPointAtLength(Math.max(0, distance - 3));
        const after = path.getPointAtLength(Math.min(length, distance + 3));
        const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + (reversing ? 180 : 0);
        movingCar.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
        progressPath.style.strokeDasharray = String(length);
        progressPath.style.strokeDashoffset = String(length - distance);
      });
      layer.classList.toggle("journey-started", progress > 0);
      layer.classList.toggle("journey-finished", progress >= .9999);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    render();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    reducedQuery.addEventListener("change", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      reducedQuery.removeEventListener("change", schedule);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div ref={root} className="global-journey" aria-hidden="true">
    <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="journey-sea" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8e0df"/><stop offset="1" stopColor="#bfcac8"/></linearGradient>
        <linearGradient id="journey-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9e2d2"/><stop offset="1" stopColor="#c9bea8"/></linearGradient>
        <pattern id="map-grid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0H0V46" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/></pattern>
        <filter id="car-shadow"><feDropShadow dx="0" dy="6" stdDeviation="5" floodOpacity=".42"/></filter>
      </defs>
      <rect className="journey-sea" width="1200" height="760" fill="url(#journey-sea)"/>
      <rect className="map-grid" width="1200" height="760" fill="url(#map-grid)"/>
      <path className="russia-outline" d="M-20 92 116 54l83 48 94-17 79 45 102-38 91 55 90-23 65 48 125-20 68 66 109 12 82 67 113 28 34 83-44 63 36 68-73 38-95-25-69 49-102-8-75 46-111-26-83 25-91-43-96 18-73-54-96 13-65-68-106-24-35-73-96-34-31-76Z"/>
      <path className="map-land-secondary" d="m1026 585 30-42 43 10 17 49-26 39-41-8Z"/>
      <path className="map-coast" d="M887 230c48 35 77 96 66 157s30 113 83 145M1019 538c19 21 23 64 10 98"/>
      <g className="map-regions">
        <path d="M78 124c54 63 51 135 21 219M194 102c-9 79 32 129 79 181M302 107c25 50 12 109-22 164M403 118c-40 66-13 126 38 166M509 113c9 77 55 110 91 167M626 118c-32 79 13 128 69 166M743 148c-9 58 30 105 91 143M861 169c-27 64 9 122 58 158M963 213c-20 65 13 108 69 145"/>
        <path d="M53 235c122-21 221 9 302 42s194 27 292-12 218-28 355 40M44 356c115-42 239-18 338 31s207 51 333 0 243-45 371 18M76 481c116-34 225-12 322 29s208 52 337 7 247-33 367 11"/>
      </g>
      <g className="map-roads"><path d="M84 312C258 238 390 352 542 292S825 196 1040 345"/><path d="M184 473C344 398 488 500 652 431s259-82 392-5"/></g>
      <g className="map-rivers"><path d="M168 153c35 76 8 134-51 201s-39 133 31 202"/><path d="M483 132c-28 87 9 145 69 201s59 131 16 206"/><path d="M811 172c44 73 22 133-28 192s-34 128 31 174"/></g>

      <g className="journey-desktop" data-journey-route>
        <path className="journey-route-base" d="M1054 622C1005 570 963 531 930 477S844 407 779 405 672 443 600 407 495 333 407 347 307 326 238 281 163 264 120 238"/>
        <path className="journey-route-progress" d="M1054 622C1005 570 963 531 930 477S844 407 779 405 672 443 600 407 495 333 407 347 307 326 238 281 163 264 120 238"/>
        <g className="journey-car" transform="translate(1054 622)" filter="url(#car-shadow)">{car}</g>
        <g className="journey-city"><circle cx="1054" cy="622" r="8"/><text x="1054" y="657">Корея</text></g>
        <g className="journey-city"><circle cx="930" cy="477" r="8"/><text x="930" y="453">Владивосток</text></g>
        <g className="journey-city"><circle cx="779" cy="405" r="8"/><text x="779" y="381">Иркутск</text></g>
        <g className="journey-city"><circle cx="600" cy="407" r="8"/><text x="600" y="383">Новосибирск</text></g>
        <g className="journey-city"><circle cx="407" cy="347" r="8"/><text x="407" y="323">Екатеринбург</text></g>
        <g className="journey-city"><circle cx="120" cy="238" r="8"/><text x="120" y="214">Москва</text></g>
      </g>

      <g className="journey-mobile" data-journey-route>
        <path className="journey-route-base" d="M648 690C708 641 690 590 638 546S566 482 606 424 679 350 622 296 545 237 584 170 641 115 600 68"/>
        <path className="journey-route-progress" d="M648 690C708 641 690 590 638 546S566 482 606 424 679 350 622 296 545 237 584 170 641 115 600 68"/>
        <g className="journey-car" transform="translate(648 690)" filter="url(#car-shadow)">{car}</g>
        <g className="journey-city"><circle cx="648" cy="690" r="9"/><text x="594" y="700">Корея</text></g>
        <g className="journey-city"><circle cx="638" cy="546" r="9"/><text x="716" y="552">Владивосток</text></g>
        <g className="journey-city"><circle cx="606" cy="424" r="9"/><text x="548" y="432">Иркутск</text></g>
        <g className="journey-city"><circle cx="622" cy="296" r="9"/><text x="700" y="303">Новосибирск</text></g>
        <g className="journey-city"><circle cx="584" cy="170" r="9"/><text x="500" y="178">Екатеринбург</text></g>
        <g className="journey-city"><circle cx="600" cy="68" r="9"/><text x="660" y="75">Москва</text></g>
      </g>
    </svg>
    <div className="journey-label"><span>Живой маршрут</span><b>Корея — Владивосток — ваш город</b></div>
  </div>;
}
