export interface CommentFlat {
  id: string | number;
  parent_id: string | number | null;
  [key: string]: unknown;
}

export interface CommentNode extends CommentFlat {
  replies: CommentNode[];
}

export const timeAgo = (iso: string): string => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return "Дөнгөж сая";
  if (s < 3600)  return `${Math.floor(s / 60)}м өмнө`;
  if (s < 86400) return `${Math.floor(s / 3600)}ц өмнө`;
  return `${Math.floor(s / 86400)}х өмнө`;
};

export const buildTree = (flat: CommentFlat[]): CommentNode[] => {
  const map: Record<string | number, CommentNode> = Object.fromEntries(
    flat.map((c) => [c.id, { ...c, replies: [] }])
  );
  return flat.reduce((roots: CommentNode[], c) => {
    if (c.parent_id != null && map[c.parent_id])
      map[c.parent_id].replies.push(map[c.id]);
    else roots.push(map[c.id]);
    return roots;
  }, []);
};