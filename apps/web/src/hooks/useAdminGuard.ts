import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "./useSession";

/**
 * Redirects to the login screen once we know nobody is signed in, and reports
 * whether the page may load its data yet.
 *
 * Both admin screens hand-rolled this. The subtlety worth keeping in one place
 * is the `!loading` guard: without it the redirect fires during the first
 * render, before `getSession` has resolved, and bounces a signed-in admin
 * straight back out.
 *
 * This is a convenience, not a security control — RLS is what actually stops a
 * non-admin reading or writing anything.
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
