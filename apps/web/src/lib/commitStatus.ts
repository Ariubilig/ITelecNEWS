import type { Dispatch, SetStateAction } from "react";
import { supabase } from "./supabase";

/** The two tables whose rows the admin screens move between statuses. */
type StatusTable = "processed_articles" | "comments";

interface CommitStatusArgs<T> {
  table: StatusTable;
  id: number;
  /** The columns to write. Applied to the local row as well, so keep them in step. */
  patch: Partial<T>;
  /** The list as it stands now — kept so a rejected write can be rolled back. */
  rows: T[];
  setRows: Dispatch<SetStateAction<T[] | null>>;
  /** Shown to the user if the database rejects the write. */
  failMessage: string;
}

/**
 * Move a row to a new status, updating the list immediately and rolling it
 * back if the write is rejected.
 *
 * The two admin screens previously disagreed here — the article grid waited
 * for the round trip before redrawing, while the moderation list updated
 * straight away — so the same action felt different depending on the page.
 *
 * RLS is the real gate: a non-admin's update is refused by the database, which
 * is exactly the case the rollback exists for.
 *
 * @returns an empty string on success, or `failMessage` if the write failed.
 */
export async function commitStatus<T extends { id: number }>(
  { table, id, patch, rows, setRows, failMessage }: CommitStatusArgs<T>,
): Promise<string> {
  setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  // The browser client is untyped (no generated database types), so the patch
  // is widened here rather than at every call site.
  const { error } = await supabase.from(table).update(patch as Record<string, unknown>).eq("id", id);
  if (!error) return "";

  setRows(rows);
  return failMessage;
}
