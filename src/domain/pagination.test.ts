import { describe, expect, it } from "vitest";
import { walkCursorPages } from "./pagination";

describe("walkCursorPages", () => {
  it("processes every page until the feed has no next cursor", async () => {
    const received: number[] = [];
    const pages = new Map<string | undefined, { items: number[]; nextCursor?: string | null }>([
      [undefined, { items: [1, 2], nextCursor: "page-2" }],
      ["page-2", { items: [3], nextCursor: "page-3" }],
      ["page-3", { items: [4, 5], nextCursor: null }]
    ]);
    const result = await walkCursorPages((cursor) => Promise.resolve(pages.get(cursor)!), async (items) => { received.push(...items); });
    expect(received).toEqual([1, 2, 3, 4, 5]);
    expect(result).toEqual({ pages: 3, received: 5 });
  });

  it("stops a feed with a repeated cursor", async () => {
    await expect(walkCursorPages(async () => ({ items: [1], nextCursor: "same" }), async () => undefined)).rejects.toThrow("повторяющийся cursor");
  });
});
