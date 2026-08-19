export type CursorPage<T> = { items: T[]; nextCursor?: string | null };

export async function walkCursorPages<T>(
  fetchPage: (cursor?: string) => Promise<CursorPage<T>>,
  consume: (items: T[], page: number) => Promise<void>
) {
  const seen = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;
  let received = 0;
  do {
    const page = await fetchPage(cursor);
    if (!Array.isArray(page.items)) throw new Error("Фид вернул страницу без массива items");
    pages += 1;
    await consume(page.items, pages);
    received += page.items.length;
    const next = page.nextCursor || undefined;
    if (next && seen.has(next)) throw new Error("Фид вернул повторяющийся cursor");
    if (next) seen.add(next);
    cursor = next;
  } while (cursor);
  return { pages, received };
}
