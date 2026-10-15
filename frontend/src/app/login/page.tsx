"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { getSession, homeFor, saveSession } from "@/lib/session";
import type { Role, Session } from "@/lib/types";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("creator");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in? Skip the form.
  useEffect(() => {
    const session = getSession();
    if (session) router.replace(homeFor(session.user.role));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session =
        mode === "signup"
          ? await api<Session>("/auth/signup", {
              method: "POST",
              body: { name, email, password, role },
            })
          : await api<Session>("/auth/login", { method: "POST", body: { email, password } });

      saveSession(session);
      router.push(homeFor(session.user.role));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="container narrow">
      <h1>Meme&apos;d</h1>
      <p className="muted">Brands run campaigns. Creators get paid for views.</p>

      <form className="card" onSubmit={onSubmit}>
        <h2>{isSignup ? "Create an account" : "Log in"}</h2>

        {isSignup && (
          <>
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />

            <label htmlFor="role">I am a</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="creator">Creator</option>
              <option value="brand">Brand</option>
            </select>
          </>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          minLength={isSignup ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isSignup && <p className="muted small">At least 8 characters.</p>}

        {error && <p className="error small">{error}</p>}

        <div style={{ marginTop: "1rem" }}>
          <button className="btn" disabled={busy}>
            {busy ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </div>
      </form>

      <p className="small">
        {isSignup ? "Already have an account? " : "New here? "}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError("");
          }}
        >
          {isSignup ? "Log in" : "Create an account"}
        </button>
      </p>
    </main>
  );
}
