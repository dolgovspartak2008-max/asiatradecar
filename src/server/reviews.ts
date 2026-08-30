import { hasDatabase, query } from "@/server/db";
import { getSeededReviewImage, telegramReviewSeeds } from "@/server/telegram-reviews";

export type PublishedReview = { id: string; title: string; text: string; image: string | null };

const fallbackReviews: PublishedReview[] = telegramReviewSeeds.map((review) => ({
  id: review.telegramFileId,
  title: review.title,
  text: review.text,
  image: review.image
}));

export async function getPublishedReviews() {
  if (!hasDatabase()) return fallbackReviews;
  const result = await query<{ id: string; title: string; text: string; telegram_file_id: string }>("SELECT id::text,title,text,telegram_file_id FROM reviews WHERE status='published' ORDER BY created_at DESC,id DESC LIMIT 60").catch(() => null);
  if (!result) return fallbackReviews;
  return result.rows.map(({ telegram_file_id, ...review }) => {
    const seededImage = getSeededReviewImage(telegram_file_id);
    return { ...review, image: seededImage === undefined ? `/api/reviews/${review.id}/image` : seededImage };
  });
}
