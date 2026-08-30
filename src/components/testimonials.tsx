import Image from "next/image";
import { getPublishedReviews } from "@/server/reviews";
import { ReviewText } from "@/components/review-text";

export async function Testimonials() {
  const reviews = (await getPublishedReviews()).filter((review) => review.image);
  if (!reviews.length) return null;
  return <section className="section testimonials" id="reviews"><div className="container"><div className="section-heading"><div><p className="eyebrow">Отзывы клиентов</p><h2>Автомобили уже в России</h2></div><p>Истории клиентов, которые прошли путь от подбора до получения автомобиля.</p></div><div className="testimonial-grid">{reviews.map((review) => <figure className="testimonial-card" key={review.id}>{review.image && <div className="testimonial-photo"><Image src={review.image} alt={`${review.title}, доставленный клиенту Asia Trade Car`} fill sizes="(max-width: 800px) 88vw, 33vw" /></div>}<figcaption>{!/^Отзыв \d+$/u.test(review.title) && <h3>{review.title}</h3>}<ReviewText text={review.text} /></figcaption></figure>)}</div></div></section>;
}
