"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { fetchAuthSession } from "@/lib/api/auth";
import { saveAdopterInterests, AdopterApiError } from "@/lib/api/adopter-client";

type RegisterInterestButtonProps = {
  animalId: string;
  animalName: string;
  isRegistered?: boolean;
  isAtCapacity?: boolean;
  dashboardHref?: string;
  manageInterestsHref?: string;
};

export function RegisterInterestButton({
  animalId,
  animalName,
  isRegistered = false,
  isAtCapacity = false,
  dashboardHref = "/dashboard",
  manageInterestsHref = "/dashboard/interests",
}: RegisterInterestButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const session = await fetchAuthSession();
      await saveAdopterInterests({ interestedAnimalIds: [animalId] }, session.csrfToken);
      router.push("/animals");
    } catch (err) {
      if (err instanceof AdopterApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsLoading(false);
    }
  }

  if (isRegistered) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-ink-soft)] font-medium">You already registered interest in this animal.</p>
        <Button variant="ghost" asChild>
          <a href={dashboardHref}>View dashboard</a>
        </Button>
        {error && (
          <p className="mt-2 text-sm text-[var(--color-danger)] font-medium">{error}</p>
        )}
      </div>
    );
  }

  if (isAtCapacity) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-ink-soft)] font-medium">Your interest list is full.</p>
        <Button variant="ghost" asChild>
          <a href={manageInterestsHref}>Manage your interests</a>
        </Button>
        {error && (
          <p className="mt-2 text-sm text-[var(--color-danger)] font-medium">{error}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="accent"
        size="lg"
        onClick={handleClick}
        disabled={isLoading}
        className="bg-[var(--color-accent)] text-white rounded-2xl px-8 py-3 font-bold shadow-[var(--shadow-coral)] hover:bg-[var(--color-accent-deep)] hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLoading ? "Saving..." : `I'm interested in ${animalName}`}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-[var(--color-danger)] font-medium">{error}</p>
      )}
    </>
  );
}
