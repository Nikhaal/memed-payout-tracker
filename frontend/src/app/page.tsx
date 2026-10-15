"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "@/lib/session";

/** The home page has no content of its own: it sends you where you belong. */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
    } else {
      router.replace(session.user.role === "brand" ? "/brand" : "/creator");
    }
  }, [router]);

  return null;
}
