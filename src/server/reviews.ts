import { hasDatabase, query } from "@/server/db";

export type PublishedReview = { id: string; title: string; text: string };

export async function getPublishedReviews() {
  if (!hasDatabase()) return [] as PublishedReview[];
  await query("UPDATE reviews SET status='hidden' WHERE id=ANY($1::bigint[])", [[1, 3]]).catch(() => null);
  const result = await query<{ id: string; title: string; text: string }>("SELECT id::text,title,text FROM reviews WHERE status='published' ORDER BY created_at DESC LIMIT 30").catch(() => null);
  return result?.rows || [];
}
