/**
 * @param {string} iso - ISO date string
 * @returns {string}
 */
export const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return "Дөнгөж сая";
  if (s < 3600)  return `${Math.floor(s / 60)}м өмнө`;
  if (s < 86400) return `${Math.floor(s / 3600)}ц өмнө`;
  return `${Math.floor(s / 86400)}х өмнө`;
};

/**
 * Converts a flat array of comment objects into a nested reply tree.
 * Each node gets a `replies` array containing its direct children.
 * @param {Array<{id: string|number, parent_id: string|number|null}>} flat
 * @returns {Array} Root-level comments with nested replies
 */
export const buildTree = (flat) => {
  const map = Object.fromEntries(flat.map((c) => [c.id, { ...c, replies: [] }]));
  return flat.reduce((roots, c) => {
    if (c.parent_id && map[c.parent_id]) map[c.parent_id].replies.push(map[c.id]);
    else roots.push(map[c.id]);
    return roots;
  }, []);
};