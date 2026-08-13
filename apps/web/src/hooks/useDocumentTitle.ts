import { useEffect } from "react";

const SITE = "UNWRITE";
const DEFAULT_TITLE = `${SITE} — Мэдээ, ойлгомжтой хэлээр`;

/**
 * Sets `document.title` for the current page, restoring the site default when
 * the page unmounts. Pass `undefined` while data is still loading to leave the
 * previous title in place rather than flashing a blank one.
 *
 * This only helps tabs, history and bookmarks. Social crawlers don't run JS,
 * so link previews still come from the static tags in index.html.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} — ${SITE}`;
    return () => { document.title = DEFAULT_TITLE; };
  }, [title]);
}
