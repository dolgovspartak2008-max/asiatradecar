import type { NextRequest } from "next/server";

const BLOCKED_BOTS = /elevenlabscrawler|serankingbacklinksbot|semrushbot|headlesschrome/i;

export function proxy(request: NextRequest) {
  if (BLOCKED_BOTS.test(request.headers.get("user-agent") || "")) return new Response("Forbidden", { status: 403 });
}

export const config = {
  matcher: [{
    // Static files, media and robots.txt/sitemap.xml are skipped; the has-filter keeps Proxy off for regular visitors.
    source: "/((?!_next/static|_next/image|media/|favicon\\.ico|icon\\.png|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|css|js|map|txt|xml|html|woff2?)$).*)",
    has: [{ type: "header", key: "user-agent", value: ".*([Ee][Ll][Ee][Vv][Ee][Nn][Ll][Aa][Bb][Ss][Cc][Rr][Aa][Ww][Ll][Ee][Rr]|[Ss][Ee][Rr][Aa][Nn][Kk][Ii][Nn][Gg][Bb][Aa][Cc][Kk][Ll][Ii][Nn][Kk][Ss][Bb][Oo][Tt]|[Ss][Ee][Mm][Rr][Uu][Ss][Hh][Bb][Oo][Tt]|[Hh][Ee][Aa][Dd][Ll][Ee][Ss][Ss][Cc][Hh][Rr][Oo][Mm][Ee]).*" }]
  }]
};
