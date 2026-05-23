"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type { AdminAdopterDetail } from "@/lib/api/admin";
import { fetchAuthSession, refreshCsrfToken } from "@/lib/api/auth";
import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";
import { Button } from "@/components/ui/button";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

    const token = csrfTokenRef.current ?? (await refreshCsrfToken());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/adopters/${adopter.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: token,
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
        if (error.fieldErrors) {
          const fe: Record<string, string> = {};
          for (const [k, v] of Object.entries(error.fieldErrors)) {
            fe[k] = Array.isArray(v) ? (v[0] ?? "") : v;
          }
          setFieldErrors(fe);
        }
        setErrorMessage(error.message ?? "Update failed.");
        return;
      }

      const updated = (await response.json()) as AdminAdopterDetail;
      onSuccess(updated);
    } catch {
      setErrorMessage("Update failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
      <p className="text-xs text-[var(--color-ink-faint)] font-medium">Edit</p>
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">Update adopter record</h2>

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5" htmlFor="adopter-name">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Name</span>
          <input
            id="adopter-name"
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-telephone">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Telephone</span>
          <input
            id="adopter-telephone"
            name="telephone"
            type="tel"
            autoComplete="tel"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.telephone}
            onChange={(e) => setFields((f) => ({ ...f, telephone: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-email">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Email</span>
          <input
            id="adopter-email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.email}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
          />
          {fieldErrors.email && <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>}
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-address">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Address</span>
          <input
            id="adopter-address"
            name="address"
            type="text"
            autoComplete="street-address"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.address}
            onChange={(e) => setFields((f) => ({ ...f, address: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="adopter-status">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Status</span>
          <select
            id="adopter-status"
            name="status"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.status}
            onChange={(e) => setFields((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {fieldErrors.status && <p className="text-sm text-red-500 mt-1">{fieldErrors.status}</p>}
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" aria-live="polite" role="status">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 items-center">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
          <Button variant="outline" type="button" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </article>
  );
}
