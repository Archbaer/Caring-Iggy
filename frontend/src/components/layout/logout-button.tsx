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
      className="link-chip shell-nav-button"
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
