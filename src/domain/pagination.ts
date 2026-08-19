export type CursorPage<T> = { items: T[]; nextCursor?: string | null };
type PageResult<T> = { page: CursorPage<T> } | { error: unknown };

export async function walkCursorPages<T>(
  fetchPage: (cursor?: string) => Promise<CursorPage<T>>,
  consume: (items: T[], page: number) => Promise<void>
) {
  const seen = new Set<string>();
  let pages = 0;
  let received = 0;
  const request = (cursor?: string): Promise<PageResult<T>> => fetchPage(cursor).then(
    (page) => ({ page }),
    (error: unknown) => ({ error })
  );
  let pending: Promise<PageResult<T>> | undefined = request();

  while (pending) {
    const result: PageResult<T> = await pending;
    if ("error" in result) throw result.error;
    const page: CursorPage<T> = result.page;
    if (!Array.isArray(page.items)) throw new Error("Фид вернул страницу без массива items");
    pages += 1;
    const next: string | undefined = page.nextCursor || undefined;
    if (next && seen.has(next)) throw new Error("Фид вернул повторяющийся cursor");
    if (next) seen.add(next);
    pending = next ? request(next) : undefined;
    await consume(page.items, pages);
    received += page.items.length;
  }
  return { pages, received };
}
