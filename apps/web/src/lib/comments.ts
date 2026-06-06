import type { Comment } from "@itelecnews/shared";

export interface CommentNode extends Comment {
  replies: CommentNode[];
}

export const timeAgo = (iso: string): string => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return "Дөнгөж сая";
  if (s < 3600)  return `${Math.floor(s / 60)}м өмнө`;
  if (s < 86400) return `${Math.floor(s / 3600)}ц өмнө`;
  return `${Math.floor(s / 86400)} өдөрийн өмнө`;
};

/** Turn flat rows into a forest of comment threads. Order is preserved. */
export const buildTree = (flat: Comment[]): CommentNode[] => {
  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of flat) nodes.set(c.id, { ...c, replies: [] });

  for (const c of flat) {
    const node = nodes.get(c.id)!;
    const parent = c.parent_id != null ? nodes.get(c.parent_id) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
};
