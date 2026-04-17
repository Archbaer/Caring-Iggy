"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type { AdminAdopterDetail } from "@/lib/api/admin";
import { fetchAuthSession } from "@/lib/api/auth";
import type { BffError } from "@/lib/types";

type EditFields = {
  name: string;
  telephone: string;
  email: string;
  address: string;
  status: string;
};

type Props = {
  adopter: AdminAdopterDetail;
  onCancel: () => void;
  onSuccess: (updated: AdminAdopterDetail) => void;
};

const STATUS_OPTIONS = ["ACTIVE", "PENDING_REVIEW", "APPROVED", "REJECTED", "INACTIVE"];

export function AdopterEditPanel({ adopter, onCancel, onSuccess }: Props) {
  const [fields, setFields] = useState<EditFields>({
    name: adopter.name,
    telephone: adopter.telephone,
    email: adopter.email,
    address: adopter.address ?? "",
    status: adopter.status,
  });
  const csrfTokenRef = useRef<string | null>(null);
  const [csrfToken, setCsrfTokenState] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchAuthSession()
      .then((session) => {
        if (!cancelled) {
          csrfTokenRef.current = session.csrfToken;
          setCsrfTokenState(session.csrfToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("Authentication is temporarily unavailable. Refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = csrfTokenRef.current ?? (await refreshCsrfTokenImpl());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/adopters/${adopter.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          name: fields.name.trim() || undefined,
          telephone: fields.telephone.trim() || undefined,
          email: fields.email.trim() || undefined,
          address: fields.address.trim() || undefined,
          status: fields.status,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as BffError;
        throw new Error(error.message ?? "Update failed.");
      }

      const updated = (await response.json()) as AdminAdopterDetail;
      onSuccess(updated);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Update failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Edit</p>
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">Update adopter record</h2>

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5" htmlFor="adopter-name">
          <span className="text-sm font-medium text-[var(--color-ink)]">Name</span>
          <input
            id="adopter-name"
            name="name"
            type="text"
            autoComplete="name"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-telephone">
          <span className="text-sm font-medium text-[var(--color-ink)]">Telephone</span>
          <input
            id="adopter-telephone"
            name="telephone"
            type="tel"
            autoComplete="tel"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.telephone}
            onChange={(e) => setFields((f) => ({ ...f, telephone: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-email">
          <span className="text-sm font-medium text-[var(--color-ink)]">Email</span>
          <input
            id="adopter-email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.email}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-address">
          <span className="text-sm font-medium text-[var(--color-ink)]">Address</span>
          <input
            id="adopter-address"
            name="address"
            type="text"
            autoComplete="street-address"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.address}
            onChange={(e) => setFields((f) => ({ ...f, address: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-status">
          <span className="text-sm font-medium text-[var(--color-ink)]">Status</span>
          <select
            id="adopter-status"
            name="status"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.status}
            onChange={(e) => setFields((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" aria-live="polite" role="status">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 items-center">
          <button type="submit" className="ci-btn ci-btn--primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            className="ci-btn ci-btn--secondary secondary"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </article>
  );
}

async function refreshCsrfTokenImpl(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.csrfToken;
  } catch {
    return null;
  }
}