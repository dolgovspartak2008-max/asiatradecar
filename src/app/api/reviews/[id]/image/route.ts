import { NextResponse } from "next/server";
import { query } from "@/server/db";
import { inferTelegramImageContentType } from "@/domain/telegram";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  const id = (await params).id;
  if (!/^\d+$/.test(id) || !process.env.TELEGRAM_BOT_TOKEN) return new NextResponse(null, { status: 404 });
  const result = await query<{ telegram_file_id: string }>("SELECT telegram_file_id FROM reviews WHERE id=$1 AND status='published' LIMIT 1", [id]).catch(() => null);
  const fileId = result?.rows[0]?.telegram_file_id;
  if (!fileId) return new NextResponse(null, { status: 404 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const metadata = await fetch(`https://api.telegram.org/bot${token}/getFile`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId }), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const payload = await metadata.json() as { ok?: boolean; result?: { file_path?: string } };
  if (!payload.ok || !payload.result?.file_path) return new NextResponse(null, { status: 404 });
  const image = await fetch(`https://api.telegram.org/file/bot${token}/${payload.result.file_path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000) });
  if (!image.ok) return new NextResponse(null, { status: 404 });
  const contentType = inferTelegramImageContentType(image.headers.get("content-type") || "", payload.result.file_path);
  const size = Number(image.headers.get("content-length") || 0);
  if (!contentType || size > 20_000_000) return new NextResponse(null, { status: 415 });
  return new NextResponse(image.body, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
