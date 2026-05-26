"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type { AdminEmployeeDetail } from "@/lib/api/admin";
import { fetchAuthSession, refreshCsrfToken } from "@/lib/api/auth";
import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";
import { Button } from "@/components/ui/button";
import type { BffError } from "@/lib/types";

type EditFields = {
  name: string;
  telephone: string;
  role: "STAFF";
};

type Props = {
  employee: AdminEmployeeDetail;
  onCancel: () => void;
  onSuccess: (updated: AdminEmployeeDetail) => void;
};

const ROLE_OPTIONS: Array<"STAFF"> = ["STAFF"];

export function StaffEditPanel({ employee, onCancel, onSuccess }: Props) {
  const [fields, setFields] = useState<EditFields>({
    name: employee.name,
    telephone: employee.telephone ?? "",
    role: "STAFF",
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

    const token = csrfTokenRef.current ?? (await refreshCsrfToken());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/staff/${employee.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          name: fields.name.trim() || undefined,
          telephone: fields.telephone.trim() || undefined,
          role: fields.role,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as BffError;
        throw new Error(error.message ?? "Update failed.");
      }

      const updated = (await response.json()) as AdminEmployeeDetail;
      onSuccess(updated);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Update failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
      <p className="text-xs text-[var(--color-ink-faint)] font-medium">Edit</p>
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">Update staff record</h2>

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5" htmlFor="staff-name">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Name</span>
          <input
            id="staff-name"
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="staff-telephone">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Telephone</span>
          <input
            id="staff-telephone"
            name="telephone"
            type="tel"
            autoComplete="tel"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.telephone}
            onChange={(e) => setFields((f) => ({ ...f, telephone: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5" htmlFor="staff-role">
          <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Role</span>
          <select
            id="staff-role"
            name="role"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
            value={fields.role}
            onChange={(e) =>
              setFields((f) => ({ ...f, role: e.target.value as "STAFF" }))
            }
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
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
