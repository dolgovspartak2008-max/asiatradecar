import { hasDatabase, query } from "@/server/db";

export type PublishedReview = { id: string; title: string; text: string };

export async function getPublishedReviews() {
  if (!hasDatabase()) return [] as PublishedReview[];
  const result = await query<{ id: string; title: string; text: string }>("SELECT id::text,title,text FROM reviews WHERE status='published' ORDER BY created_at DESC LIMIT 30").catch(() => null);
  return result?.rows || [];
}
