import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAdminGuard } from "./useAdminGuard";
import { useQuery } from "./useQuery";

/** The two tables the admin screens move rows between statuses in. */
type Table = "processed_articles" | "comments";

interface Options<T> {
  /** A query builder from lib/queries — run only once the guard reports authed. */
  query: () => PromiseLike<{ data: T[] | null; error: unknown }>;
  table: Table;
  /** Shown when the list itself fails to load. */
  loadError: string;
}

/**
 * Everything an admin list screen needs: the guard, the fetch, status tallies,
 * and a writer that updates a row optimistically and rolls back if the
 * database refuses — which is exactly what RLS does to a non-admin.
 */
export function useAdminList<T extends { id: number; status?: string }>(
  { query, table, loadError }: Options<T>,
) {
  const authed = useAdminGuard();
  const [writeError, setWriteError] = useState("");

  const { data, loading, error: failed, setData } = useQuery<T[]>(query, [authed], authed);
  const rows = data ?? [];

  /** Write a patch to one row. Returns nothing; failures surface via `error`. */
  const update = async (id: number, patch: Partial<T>, failMessage: string) => {
    setWriteError("");
    setData(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

    // The browser client has no generated database types, so the patch is
    // widened here rather than at each call site.
    const { error } = await supabase
      .from(table)
      .update(patch as Record<string, unknown>)
      .eq("id", id);

    if (error) {
      setData(rows);
      setWriteError(failMessage);
    }
  };

  // Rows with no status count as drafts, matching how the cards render them.
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.status ?? "draft";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    rows,
    counts,
    loading,
    error: writeError || (failed ? loadError : ""),
    update,
  };
}
