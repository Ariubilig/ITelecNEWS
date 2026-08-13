import { describe, expect, it, afterEach, vi } from "vitest";
import type { Comment } from "@itelecnews/shared";
import { buildTree, timeAgo } from "../apps/web/src/lib/comments.js";

const at = (iso: string) => iso;

const comment = (id: number, parent_id: number | null = null): Comment => ({
  id,
  parent_id,
  article_id: 1,
  guest_name: `user${id}`,
  content: `comment ${id}`,
  created_at: at("2026-01-01T00:00:00Z"),
});

describe("buildTree", () => {
  it("returns an empty forest for no comments", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("keeps flat comments as roots, in order", () => {
    const tree = buildTree([comment(1), comment(2), comment(3)]);
    expect(tree.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(tree.every((c) => c.replies.length === 0)).toBe(true);
  });

  it("nests replies under their parent", () => {
    const tree = buildTree([comment(1), comment(2, 1), comment(3, 1)]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.replies.map((r) => r.id)).toEqual([2, 3]);
  });

  it("nests arbitrarily deep", () => {
    // The CSS only styles three levels (depth-0..2), but the tree itself is
    // unbounded — depth 3 must still be reachable, not dropped.
    const tree = buildTree([comment(1), comment(2, 1), comment(3, 2), comment(4, 3)]);
    expect(tree[0]!.replies[0]!.replies[0]!.replies[0]!.id).toBe(4);
  });

  it("promotes a reply whose parent is missing to a root", () => {
    // Happens once moderation hides a parent: the child is still published but
    // its parent no longer comes back from the query. It must stay visible
    // rather than vanishing.
    const tree = buildTree([comment(2, 99)]);
    expect(tree.map((c) => c.id)).toEqual([2]);
  });

  it("does not mutate the input rows", () => {
    const rows = [comment(1), comment(2, 1)];
    const snapshot = structuredClone(rows);
    buildTree(rows);
    expect(rows).toEqual(snapshot);
  });

  it("handles a reply appearing before its parent", () => {
    const tree = buildTree([comment(2, 1), comment(1)]);
    expect(tree.map((c) => c.id)).toEqual([1]);
    expect(tree[0]!.replies.map((r) => r.id)).toEqual([2]);
  });

  it("survives a parent cycle without infinite recursion", () => {
    // Not reachable through the UI, but a self-referencing row must not hang
    // the render. Nothing is a root, so the forest is simply empty.
    const tree = buildTree([comment(1, 1)]);
    expect(tree).toEqual([]);
  });
});

describe("timeAgo", () => {
  const NOW = new Date("2026-01-01T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(NOW.getTime() - ms).toISOString());

  const useFakeNow = () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  };
  afterEach(() => vi.useRealTimers());

  it("reports seconds as 'just now'", () => {
    useFakeNow();
    expect(ago(0)).toBe("Дөнгөж сая");
    expect(ago(59_000)).toBe("Дөнгөж сая");
  });

  it("switches to minutes at 60s", () => {
    useFakeNow();
    expect(ago(60_000)).toBe("1м өмнө");
    expect(ago(59 * 60_000)).toBe("59м өмнө");
  });

  it("switches to hours at 60m", () => {
    useFakeNow();
    expect(ago(3_600_000)).toBe("1ц өмнө");
    expect(ago(23 * 3_600_000)).toBe("23ц өмнө");
  });

  it("switches to days at 24h", () => {
    useFakeNow();
    expect(ago(86_400_000)).toBe("1 өдөрийн өмнө");
    expect(ago(10 * 86_400_000)).toBe("10 өдөрийн өмнө");
  });
});
