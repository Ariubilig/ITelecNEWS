import { useEffect, useRef, useState } from "react";

type QueryResult<T> = { data: T | null; error: unknown };

/**
 * Tiny data-fetch hook for Supabase query builders (thenables that resolve to
 * `{ data, error }`). Collapses the loading / error / cancel-on-unmount
 * boilerplate every page was hand-rolling.
 *
 * @param query   Returns a thenable resolving to `{ data, error }`.
 * @param key     Re-run the query whenever these change (compared by value).
 * @param enabled While `false`, the query is skipped and stays in `loading`.
 * @returns `{ data, loading, error, setData, refetch }` — `setData` for
 *          optimistic updates, `refetch` to re-run on demand.
 */
export function useQuery<T>(
  query: () => PromiseLike<QueryResult<T>>,
  key: React.DependencyList,
  enabled = true,
) {
  const [data, setData]     = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [nonce, setNonce]   = useState(0);

  // Read the latest closure inside the effect so the deps array stays a literal —
  // this repo's react-hooks config rejects forwarding a caller-supplied deps array.
  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; });

  // Stringify the caller's deps so identity-changing arrays still re-run only
  // when their contents change.
  const depKey = JSON.stringify(key);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const res = await queryRef.current();
      if (!active) return;
      setError(!!res.error);
      if (!res.error) setData(res.data);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [depKey, enabled, nonce]);

  return {
    data,
    loading,
    error,
    setData,
    refetch: () => setNonce((n) => n + 1),
  };
}
