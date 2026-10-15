"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, homeFor } from "./session";
import type { Role, Session } from "./types";

/**
 * Guard for role-specific pages. Returns the session once we know the visitor
 * is logged in with the right role, otherwise redirects (and returns null
 * until then, so pages should render nothing while it is null).
 */
export function useRequireRole(role: Role): Session | null {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    if (current.user.role !== role) {
      router.replace(homeFor(current.user.role));
      return;
    }
    setSession(current);
  }, [role, router]);

  return session;
}
