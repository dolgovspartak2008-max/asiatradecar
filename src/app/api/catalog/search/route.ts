import { NextRequest, NextResponse } from "next/server";
import { searchCars } from "@/server/catalog";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("q")?.slice(0, 100) || "";
  if (term.length < 2) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await searchCars(term) }, { headers: { "Cache-Control": "private, max-age=30" } });
}
