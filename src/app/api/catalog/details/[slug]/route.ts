import { getCarBySlug } from "@/server/catalog";
import { readCostBreakdown } from "@/domain/car-details";
import { getPricingSettings } from "@/server/pricing";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  const car = await getCarBySlug(slug);
  const settings = await getPricingSettings();
  const commissionRub = car ? settings.commissions[car.country === "jp" ? "jp" : car.country === "cn" ? "cn" : "kr"] : settings.commissions.kr;
  const brokerRub = car?.country === "kr" ? 110_000 : car?.country === "jp" ? 60_000 : 80_000;
  return car
    ? Response.json({ priceKrw: car.priceKrw, priceRub: car.priceRub, details: { ...car.details, costBreakdown: readCostBreakdown(car.details, commissionRub, brokerRub) } })
    : Response.json({ message: "Автомобиль не найден" }, { status: 404 });
}
