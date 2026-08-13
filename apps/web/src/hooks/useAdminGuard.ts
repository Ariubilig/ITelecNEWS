import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "./useSession";

/**
 * Redirects to login once we know nobody is signed in, and reports whether the
 * page may load its data yet.
 *
 * The `!loading` guard matters: without it the redirect fires on the first
 * render, before `getSession` resolves, and bounces a signed-in admin out.
 *
 * A convenience, not a security control — RLS is what actually stops a
 * non-admin reading or writing.
 */
export function useAdminGuard(): boolean {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const authed = !!session;

  useEffect(() => {
    if (!loading && !authed) navigate("/admin/login");
  }, [loading, authed, navigate]);

  return authed;
}
