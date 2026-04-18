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
  dashboardHref?: string;
};

export function RegisterInterestButton({
  animalId,
  animalName,
  isRegistered = false,
  dashboardHref = "/dashboard",
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
        <p className="text-sm text-[var(--color-ink-soft)]">You already registered interest in this animal.</p>
        <Button variant="ghost" as="a" href={dashboardHref}>
          View dashboard
        </Button>
        {error && (
          <p className="mt-2 text-sm text-[var(--color-error)]">{error}</p>
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
      >
        {isLoading ? "Saving..." : `I'm interested in ${animalName}`}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-[var(--color-error)]">{error}</p>
      )}
    </>
  );
}
