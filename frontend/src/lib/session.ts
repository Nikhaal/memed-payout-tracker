import type { Role, Session } from "./types";

const KEY = "memed_session";

// localStorage can throw (private windows, blocked storage), so every access is wrapped.

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Ignore: the user just has to log in again next time.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

/** Where each role lands after logging in. */
export function homeFor(role: Role): string {
  return role === "brand" ? "/brand" : "/creator";
}
