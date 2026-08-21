import { getCarBySlug } from "@/server/catalog";
import { readCostBreakdown } from "@/domain/car-details";
import { getPricingSettings } from "@/server/pricing";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  const car = await getCarBySlug(slug);
  const settings = await getPricingSettings();
  return car
    ? Response.json({ priceKrw: car.priceKrw, priceRub: car.priceRub, details: { ...car.details, costBreakdown: readCostBreakdown(car.details, settings.commissionRub) } })
    : Response.json({ message: "Автомобиль не найден" }, { status: 404 });
}
