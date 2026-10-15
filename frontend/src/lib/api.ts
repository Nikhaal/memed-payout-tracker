import { clearSession, getSession } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Turn anything thrown into a message that is safe to show the user. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * One function for every backend call. Adds the JWT when logged in, parses
 * the JSON reply, and throws an ApiError with a readable message on failure.
 *
 *   const data = await api<{ campaigns: Campaign[] }>("/campaigns/mine");
 *   await api("/campaigns", { method: "POST", body: { ... } });
 */
export async function api<T = unknown>(
  path: string,
  { method = "GET", body }: RequestOptions = {}
): Promise<T> {
  const token = getSession()?.token;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Token expired or invalid: drop it and send the user to the login page.
    if (res.status === 401 && token && !path.startsWith("/auth/")) {
      clearSession();
      window.location.href = "/login";
    }
    // Validation errors come with a list of per-field messages.
    const details = Array.isArray(data.details)
      ? data.details.map((d: { message: string }) => d.message).join(". ")
      : "";
    throw new ApiError(
      res.status,
      [data.error, details].filter(Boolean).join(": ") || "Request failed"
    );
  }

  return data as T;
}
