import { NextRequest, NextResponse } from "next/server";
import { parseCatalogParams } from "@/domain/catalog";
import { getCatalog } from "@/server/catalog";
import { rememberCatalogPrices } from "@/server/catalog-price-cache";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseCatalogParams(params);
  const page = Math.floor(filters.offset / filters.limit) + 1;
  try {
    const result = await getCatalog(filters);
    rememberCatalogPrices(result.cars);
    return NextResponse.json({
      items: result.cars,
      total: result.total,
      page,
      hasMore: page * filters.limit < result.total && result.cars.length > 0
    }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ message: "Источник не ответил. Уже загруженные автомобили остаются доступны." }, { status: 502 });
  }
}
