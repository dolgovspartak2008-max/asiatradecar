type IconName = "arrow" | "calculator" | "car" | "check" | "heart" | "menu" | "phone" | "route" | "search" | "shield" | "x";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  calculator: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/></>,
  car: <><path d="m5 17-1-1v-4l2-5h12l2 5v4l-1 1"/><path d="M4 13h16M7 13h.01M17 13h.01M7 17v2M17 17v2"/></>,
  check: <path d="m5 12 4 4L19 6" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />,
  route: <><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h3a4 4 0 0 0 4-4v-4a4 4 0 0 1 3-4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  x: <path d="m6 6 12 12M18 6 6 18" />
};

export function Icon({ name, size = 22, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
