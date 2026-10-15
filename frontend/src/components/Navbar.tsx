"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export default function Navbar({ session }: { session: Session }) {
  const router = useRouter();

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <header className="navbar">
      <strong>Meme&apos;d</strong>
      <div className="navbar-right">
        <span>{session.user.name}</span>
        <span className="badge">{session.user.role}</span>
        <button className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
