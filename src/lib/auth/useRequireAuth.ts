"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/** `/login?next=<path>` — the auth screen returns to `next` after sign-in. */
export function loginHref(next?: string) {
  const target = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `/login?next=${encodeURIComponent(target)}`;
}

/**
 * "Act, then sign in": show normal action buttons to everyone and wrap their handlers.
 * Signed in → runs `action`. Guest → goes to `/login?next=<current page>` (or `next`).
 * Returns whether the action ran. Never wrap SOS or hotline calls with this.
 *
 *   const requireAuth = useRequireAuth();
 *   <Button onClick={() => requireAuth(() => vote())}>Vote</Button>
 */
export function useRequireAuth() {
  const { user, ready } = useAuth();
  const router = useRouter();
  return useCallback(
    (action?: () => void | Promise<void>, next?: string): boolean => {
      if (!ready) return false;
      if (user) {
        void action?.();
        return true;
      }
      router.push(loginHref(next));
      return false;
    },
    [user, ready, router],
  );
}

/**
 * For pages that only make sense signed in (new report form, my reports, notifications…):
 * guests are sent straight to login and come back here afterwards.
 * Returns true while the page should render nothing (auth loading or redirecting).
 */
export function useGuestRedirect(next?: string) {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace(loginHref(next));
  }, [ready, user, router, next]);
  return !ready || !user;
}
