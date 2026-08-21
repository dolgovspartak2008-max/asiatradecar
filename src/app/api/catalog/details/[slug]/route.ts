import { getCarBySlug } from "@/server/catalog";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  const car = await getCarBySlug(slug);
  return car
    ? Response.json({ priceKrw: car.priceKrw, priceRub: car.priceRub, details: car.details })
    : Response.json({ message: "Автомобиль не найден" }, { status: 404 });
}
