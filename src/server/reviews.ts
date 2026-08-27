import { hasDatabase, query } from "@/server/db";
import { getSeededReviewImage } from "@/server/telegram-reviews";

export type PublishedReview = { id: string; title: string; text: string; image: string | null };

export async function getPublishedReviews() {
  if (!hasDatabase()) return [] as PublishedReview[];
  const result = await query<{ id: string; title: string; text: string; telegram_file_id: string }>("SELECT id::text,title,text,telegram_file_id FROM reviews WHERE status='published' ORDER BY created_at DESC,id DESC LIMIT 60").catch(() => null);
  return result?.rows.map(({ telegram_file_id, ...review }) => {
    const seededImage = getSeededReviewImage(telegram_file_id);
    return { ...review, image: seededImage === undefined ? `/api/reviews/${review.id}/image` : seededImage };
  }) || [];
}
