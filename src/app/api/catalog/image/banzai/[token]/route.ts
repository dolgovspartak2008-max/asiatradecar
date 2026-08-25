import { fetchBanzaiImage } from "@/server/banzai";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,2048}$/.test(token)) return new Response(null, { status: 400 });
  try {
    const image = await fetchBanzaiImage(token);
    if (!image.ok || !image.body) return new Response(null, { status: image.status || 502 });
    return new Response(image.body, {
      headers: {
        "Content-Type": image.headers.get("content-type") || "image/webp",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      }
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
