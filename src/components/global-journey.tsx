"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const car = <g className="journey-car-shape">
  <path className="car-body" d="M-27-25C-22-34-13-39 0-40c13 1 22 6 27 15l5 47c1 10-6 18-16 19h-32c-10-1-17-9-16-19Z"/>
  <path className="car-hood" d="M-22-23C-15-31 15-31 22-23l-4 13h-36Z"/>
  <path className="car-windshield" d="M-18-7h36l-5 14h-26Z"/>
  <path className="car-roof" d="M-13 9h26l3 17h-32Z"/>
  <path className="car-rear-glass" d="m-16 28 4 7h24l4-7Z"/>
  <path className="car-detail" d="M0-31v62M-23-8h46M-25 27h50"/>
  <rect className="car-wheel" x="-35" y="-17" width="7" height="16" rx="3"/><rect className="car-wheel" x="28" y="-17" width="7" height="16" rx="3"/>
  <rect className="car-wheel" x="-35" y="18" width="7" height="15" rx="3"/><rect className="car-wheel" x="28" y="18" width="7" height="15" rx="3"/>
  <path className="car-mirror" d="m-28-8-8 4v7l8-1M28-8l8 4v7l-8-1"/>
  <path className="car-light" d="m-22-25 9-3M22-25l-9-3M-20 35h8M20 35h-8"/>
</g>;

export function GlobalJourney() {
  const pathname = usePathname();
  const visible = pathname === "/" || pathname === "/orders";
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const layer = root.current;
    const routeSets = layer ? Array.from(layer.querySelectorAll<SVGGElement>("[data-journey-route]")).flatMap((set) => {
      const path = set.querySelector<SVGPathElement>(".journey-route-base");
      const progressPath = set.querySelector<SVGPathElement>(".journey-route-progress");
      const movingCar = set.querySelector<SVGGElement>(".journey-car");
      return path && progressPath && movingCar ? [{ path, progressPath, movingCar, length: path.getTotalLength() }] : [];
    }) : [];
    if (!layer || !routeSets.length) return;
    const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let maxScroll = 1;
    let start = 0;
    let mobile = innerWidth <= 540;
    let lastProgress = -1;
    let lastRoute = -1;

    routeSets.forEach(({ progressPath, length }) => {
      progressPath.style.strokeDasharray = String(length);
      progressPath.style.strokeDashoffset = String(length);
    });

    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const hero = pathname === "/" ? document.querySelector<HTMLElement>(".hero") : null;
      start = hero?.offsetHeight ?? 0;
      mobile = innerWidth <= 540;
    };

    const render = () => {
      frame = 0;
      const atEnd = maxScroll - scrollY <= 1;
      const progress = reducedQuery.matches ? 0 : atEnd ? 1 : Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, maxScroll - start)));
      const route = routeSets[mobile ? 1 : 0] ?? routeSets[0];
      const routeIndex = routeSets.indexOf(route);
      if (routeIndex === lastRoute && progress === lastProgress) return;
      const { path, progressPath, movingCar, length } = route;
      const distance = length * progress;
      const point = path.getPointAtLength(distance);
      const before = path.getPointAtLength(Math.max(0, distance - 3));
      const after = path.getPointAtLength(Math.min(length, distance + 3));
      const heading = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + 90;
      const angle = ((heading + 180) % 360 + 360) % 360 - 180;
      movingCar.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
      progressPath.style.strokeDashoffset = String(length - distance);
      lastProgress = progress;
      lastRoute = routeIndex;
      layer.classList.toggle("journey-started", progress > 0);
    };
    const schedule = () => { if (!frame && !reducedQuery.matches) frame = requestAnimationFrame(render); };
    const refresh = () => {
      measure();
      lastProgress = -1;
      if (!frame) frame = requestAnimationFrame(render);
    };
    measure();
    render();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", refresh, { passive: true });
    reducedQuery.addEventListener("change", refresh);
    const observer = new ResizeObserver(refresh);
    observer.observe(document.documentElement);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", refresh);
      reducedQuery.removeEventListener("change", refresh);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname, visible]);

  if (!visible) return null;
  return <div ref={root} className="global-journey" aria-hidden="true">
    <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="journey-sea" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8e0df"/><stop offset="1" stopColor="#bfcac8"/></linearGradient>
        <linearGradient id="journey-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9e2d2"/><stop offset="1" stopColor="#c9bea8"/></linearGradient>
        <pattern id="map-grid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0H0V46" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/></pattern>
        <pattern id="map-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".8" fill="#685f4e" fillOpacity=".18"/></pattern>
      </defs>
      <rect className="journey-sea" width="1200" height="760" fill="url(#journey-sea)"/>
      <rect className="map-grid" width="1200" height="760" fill="url(#map-grid)"/>
      <g className="map-sea-depth"><path d="M930 80c91 92 127 201 112 313s32 205 116 274"/><path d="M1001 57c109 103 151 229 137 354s24 222 91 292"/><path d="M1081 41c91 106 129 243 112 382"/></g>
      <path className="russia-outline" d="M-20 92 116 54l83 48 94-17 79 45 102-38 91 55 90-23 65 48 125-20 68 66 109 12 82 67 113 28 34 83-44 63 36 68-73 38-95-25-69 49-102-8-75 46-111-26-83 25-91-43-96 18-73-54-96 13-65-68-106-24-35-73-96-34-31-76Z"/>
      <path className="map-land-texture" d="M-20 92 116 54l83 48 94-17 79 45 102-38 91 55 90-23 65 48 125-20 68 66 109 12 82 67 113 28 34 83-44 63 36 68-73 38-95-25-69 49-102-8-75 46-111-26-83 25-91-43-96 18-73-54-96 13-65-68-106-24-35-73-96-34-31-76Z" fill="url(#map-dots)"/>
      <path className="map-land-secondary" d="m1026 585 30-42 43 10 17 49-26 39-41-8Z"/>
      <path className="map-coast" d="M887 230c48 35 77 96 66 157s30 113 83 145M1019 538c19 21 23 64 10 98"/>
      <g className="map-regions">
        <path d="M78 124c54 63 51 135 21 219M194 102c-9 79 32 129 79 181M302 107c25 50 12 109-22 164M403 118c-40 66-13 126 38 166M509 113c9 77 55 110 91 167M626 118c-32 79 13 128 69 166M743 148c-9 58 30 105 91 143M861 169c-27 64 9 122 58 158M963 213c-20 65 13 108 69 145"/>
        <path d="M53 235c122-21 221 9 302 42s194 27 292-12 218-28 355 40M44 356c115-42 239-18 338 31s207 51 333 0 243-45 371 18M76 481c116-34 225-12 322 29s208 52 337 7 247-33 367 11"/>
      </g>
      <g className="map-roads"><path d="M84 312C258 238 390 352 542 292S825 196 1040 345"/><path d="M184 473C344 398 488 500 652 431s259-82 392-5"/></g>
      <g className="map-rivers"><path d="M168 153c35 76 8 134-51 201s-39 133 31 202"/><path d="M483 132c-28 87 9 145 69 201s59 131 16 206"/><path d="M811 172c44 73 22 133-28 192s-34 128 31 174"/></g>
      <g className="map-contours"><path d="M89 176c63-40 132-37 187 8s113 48 177 6M570 171c79-42 153-30 209 24s123 55 195 17M142 525c78-42 146-30 210 17s127 47 192 4M655 537c73-48 146-45 210-2s139 45 214-5"/><path d="M112 199c52-30 111-24 159 12s102 40 153 12M601 199c62-29 123-20 172 23s103 47 161 26M174 550c57-28 112-20 164 13s101 34 154 7M700 562c55-31 112-27 164 3s108 31 160-2"/></g>
      <g className="map-minor-roads"><path d="M116 188 244 235 363 202 486 261 614 221 739 271 859 245 970 318"/><path d="M132 408 259 371 388 426 518 372 661 486 794 450 916 493"/><path d="M276 132 352 228 331 346 417 482M711 161 676 278 751 391 720 532"/></g>
      <g className="map-railways"><path d="M119 249C258 279 340 342 407 347s128 31 193 60 120-1 179-2 96 42 151 72"/><path d="M244 235 333 214 407 347M600 407 701 324 779 405M779 405 846 285 930 477"/></g>
      <g className="map-places"><circle cx="238" cy="281" r="3"/><circle cx="407" cy="347" r="3"/><circle cx="600" cy="407" r="3"/><circle cx="779" cy="405" r="3"/><circle cx="930" cy="477" r="3"/><circle cx="333" cy="214" r="2.5"/><circle cx="517" cy="287" r="2.5"/><circle cx="701" cy="324" r="2.5"/><circle cx="846" cy="285" r="2.5"/><circle cx="152" cy="357" r="2"/><circle cx="292" cy="431" r="2"/><circle cx="466" cy="464" r="2"/><circle cx="555" cy="232" r="2"/><circle cx="655" cy="354" r="2"/><circle cx="742" cy="230" r="2"/><circle cx="879" cy="377" r="2"/><circle cx="985" cy="430" r="2"/></g>
      <g className="map-labels">
        <text x="238" y="255">Москва</text><text x="360" y="190">Казань</text><text x="407" y="378">Екатеринбург</text><text x="485" y="265">Челябинск</text><text x="585" y="330">Омск</text>
        <text x="600" y="442">Новосибирск</text><text x="700" y="298">Красноярск</text><text x="779" y="438">Иркутск</text><text x="846" y="260">Чита</text><text x="950" y="380">Хабаровск</text><text x="930" y="505">Владивосток</text>
        <text className="map-region-name" x="470" y="470">РОССИЯ</text><text className="map-water-name" x="1035" y="555">ЯПОНСКОЕ МОРЕ</text>
        <g className="map-small-labels"><text x="286" y="410">Самара</text><text x="516" y="208">Тюмень</text><text x="650" y="258">Томск</text><text x="820" y="300">Улан-Удэ</text><text x="888" y="350">Благовещенск</text><text x="1018" y="458">Уссурийск</text></g>
      </g>

      <g className="journey-desktop" data-journey-route>
        <path className="journey-route-road" d="M930 477C868 414 831 406 779 405S672 443 600 407 495 333 407 347 307 326 238 281"/>
        <path className="journey-route-base" d="M930 477C868 414 831 406 779 405S672 443 600 407 495 333 407 347 307 326 238 281"/>
        <path className="journey-route-progress" d="M930 477C868 414 831 406 779 405S672 443 600 407 495 333 407 347 307 326 238 281"/>
        <g className="journey-car" transform="translate(930 477)">{car}</g>
        <g className="journey-city"><circle cx="930" cy="477" r="8"/><text x="930" y="453">Владивосток</text></g>
        <g className="journey-city"><circle cx="779" cy="405" r="8"/><text x="779" y="381">Иркутск</text></g>
        <g className="journey-city"><circle cx="600" cy="407" r="8"/><text x="600" y="383">Новосибирск</text></g>
        <g className="journey-city"><circle cx="407" cy="347" r="8"/><text x="407" y="323">Екатеринбург</text></g>
        <g className="journey-city"><circle cx="238" cy="281" r="8"/><text x="238" y="257">Москва</text></g>
      </g>

      <g className="journey-mobile" data-journey-route>
        <path className="journey-route-road" d="M720 548C692 490 662 447 650 416S680 350 625 302 570 260 555 224 518 185 470 154"/>
        <path className="journey-route-base" d="M720 548C692 490 662 447 650 416S680 350 625 302 570 260 555 224 518 185 470 154"/>
        <path className="journey-route-progress" d="M720 548C692 490 662 447 650 416S680 350 625 302 570 260 555 224 518 185 470 154"/>
        <g className="journey-car" transform="translate(720 548)">{car}</g>
        <g className="journey-city"><circle cx="720" cy="548" r="9"/><text x="690" y="578">Владивосток</text></g>
        <g className="journey-city"><circle cx="650" cy="416" r="9"/><text x="650" y="392">Иркутск</text></g>
        <g className="journey-city"><circle cx="625" cy="302" r="9"/><text x="625" y="278">Новосибирск</text></g>
        <g className="journey-city"><circle cx="555" cy="224" r="9"/><text x="570" y="198">Екатеринбург</text></g>
        <g className="journey-city"><circle cx="470" cy="154" r="9"/><text x="492" y="130">Москва</text></g>
      </g>
    </svg>
  </div>;
}
