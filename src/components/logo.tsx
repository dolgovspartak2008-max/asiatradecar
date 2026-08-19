import Link from "next/link";

export function Logo() {
  return <Link className="logo" href="/" aria-label="ASIA TRADE CAR — на главную">
    <svg width="35" height="24" viewBox="0 0 70 48" aria-hidden="true"><path d="M4 39 21 9h10L18 39Zm20 0L41 9h10L38 39Zm20 0 13-23 9 15H55l-4 8Z" fill="currentColor"/></svg>
    <span><b>ASIA TRADE</b><small>CAR</small></span>
  </Link>;
}
