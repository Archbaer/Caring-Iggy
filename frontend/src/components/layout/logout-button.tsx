"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { fetchAuthSession, logout } from "@/lib/api/auth";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      className="px-3 py-1.5 rounded-full text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
      disabled={isPending}
      onClick={() => {
        void handleLogout();
      }}
    >
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );

  async function handleLogout() {
    setIsPending(true);

    try {
      const session = await fetchAuthSession();
      await logout(session.csrfToken);
      router.replace("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }
}
