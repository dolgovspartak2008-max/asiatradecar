import { hasDatabase, query } from "@/server/db";
import { getSeededReviewImage } from "@/server/telegram-reviews";

export type PublishedReview = { id: string; title: string; text: string; image: string | null };

const fallbackReviews: PublishedReview[] = [
  {
    id: "fallback-lexus-rx300",
    title: "Lexus RX 300",
    text: "Добрый вечер, хочу сказать огромное спасибо компании Asia Trade Car, особенно Павлу Платонову, за мой новый автомобиль. В этом году решила сделать себе подарок на день рождения. Ещё с весны начала искать, как осуществить мечту. Для меня было важно, чтобы машина была новая, без пробега за рубежом. Павел всегда был на связи и отвечал на все вопросы. После оплаты машина уже через неделю была в Новосибирске. Павел сопровождал до места получения, и теперь я счастливый обладатель нового RX300! Ещё раз большое спасибо!",
    image: "/media/reviews/lexus-rx300.webp"
  },
  {
    id: "fallback-toyota-corolla",
    title: "Toyota Corolla",
    text: "Я приобрела Toyota Corolla через Asia Trade Car. Всё прошло чётко: от подбора до оформления. Покупку сопровождал Павел: оперативно отвечал, подробно консультировал, был включён на каждом этапе вплоть до постановки автомобиля на учёт. У меня не было опыта дистанционного приобретения автомобиля и были опасения, а всё оказалось легко и понятно. Получила автомобиль в идеальном состоянии, который полностью соответствует описанию. Я очень довольна сотрудничеством, рекомендую!",
    image: "/media/reviews/toyota-corolla.webp"
  },
  {
    id: "fallback-changan",
    title: "Changan",
    text: "Хочу оставить отзыв о своём спонтанном решении и нисколько о нём не жалею. Заказала авто у Павла, на всём протяжении он терпеливо отвечал на мои вопросы и консультировал на каждом этапе. Возникли непредвиденные обстоятельства на таможне, но Павел объяснил все возможные варианты развития событий и успокоил. Вошёл с пониманием и не изменил стоимость авто, за что ему отдельная благодарность! Теперь моя красотка радует меня. Рекомендую компанию Asia Trade Car и Павла всем!",
    image: "/media/reviews/changan.webp"
  },
  {
    id: "fallback-hyundai-tucson",
    title: "Hyundai Tucson",
    text: "Благодарим Артура и всю команду Asia Trade Car за полное сопровождение в процессе приобретения автомобиля. Автомобиль пришёл как на фото и видео, в идеальном состоянии. Артур помогал с машиной и после приобретения, консультировал по эксплуатации. Поставили на учёт без каких-либо проблем. Один месяц — и машина у меня! Огромная благодарность Артуру и всей команде Asia Trade Car. Процветания вам!",
    image: "/media/reviews/hyundai-tucson.webp"
  },
  {
    id: "fallback-volkswagen-sagitar",
    title: "Volkswagen Sagitar",
    text: "Хочу выразить огромную благодарность компании Asia Trade и нашему менеджеру Олегу. Мы долго выбирали модель, и Олег всегда был на связи, предлагал подходящие варианты в рамках бюджета. В итоге он предложил рассмотреть Sagitar: автомобиль подошёл по всем параметрам, а максимальная комплектация стоила как базовая Octavia. Олег забронировал и организовал проверку автомобиля, отвечал на все вопросы. Через пару месяцев наш новый автомобиль уже был в Томске. Следующий автомобиль обязательно закажем через Asia Trade. Спасибо вам большое!",
    image: "/media/reviews/volkswagen-sagitar.webp"
  }
];

export async function getPublishedReviews() {
  if (!hasDatabase()) return fallbackReviews;
  const result = await query<{ id: string; title: string; text: string; telegram_file_id: string }>("SELECT id::text,title,text,telegram_file_id FROM reviews WHERE status='published' ORDER BY created_at DESC,id DESC LIMIT 60").catch(() => null);
  if (!result) return fallbackReviews;
  return result.rows.map(({ telegram_file_id, ...review }) => {
    const seededImage = getSeededReviewImage(telegram_file_id);
    return { ...review, image: seededImage === undefined ? `/api/reviews/${review.id}/image` : seededImage };
  });
}
