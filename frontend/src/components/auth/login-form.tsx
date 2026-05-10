"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthApiError, fetchAuthSession, login, refreshCsrfToken } from "@/lib/api/auth";
import { defaultRouteForRole } from "@/lib/auth/role-check";

type LoginFields = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const csrfTokenRef = useRef<string | null>(null);
  const [fields, setFields] = useState<LoginFields>({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchAuthSession()
      .then((session) => {
        if (!cancelled) {
          csrfTokenRef.current = session.csrfToken;
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

    if (token) csrfTokenRef.current = token;

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const result = await login(fields, token);
      csrfTokenRef.current = result.csrfToken;
      router.replace(
        defaultRouteForRole(result.user.role),
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(toDisplayMessage(error));

      if (error instanceof AuthApiError && error.responseError.code === "FORBIDDEN") {
        const nextToken = await refreshCsrfToken();

        if (nextToken) {
          csrfTokenRef.current = nextToken;
        }
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
      <p className="mb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
        Existing account
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mb-2">
        Sign in
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
        Use the email and password tied to your Caring Iggy account.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-glow)] transition-all duration-200"
            value={fields.email}
            onChange={(event) => setFields((f) => ({ ...f, email: event.target.value }))}
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="login-password" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-glow)] transition-all duration-200"
            value={fields.password}
            onChange={(event) => setFields((f) => ({ ...f, password: event.target.value }))}
            required
          />
        </div>

        {/* Error */}
        {errorMessage && (
          <p className="rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)] font-medium" aria-live="polite" role="status">
            {errorMessage}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-2xl bg-[var(--color-primary)] text-white px-6 py-3.5 text-sm font-bold shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-deep)] hover:shadow-[var(--shadow-lg)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
          <Link
            href="/signup"
            className="text-sm text-[var(--color-primary)] font-semibold hover:underline"
          >
            Need an account?
          </Link>
        </div>
      </form>
    </article>
  );

}

function toDisplayMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) {
    return "Authentication is temporarily unavailable. Please try again shortly.";
  }

  const { code, status } = error.responseError;

  if (code === "UNAUTHORIZED") {
    return "That email and password combination was not recognized.";
  }
  if (code === "VALIDATION_ERROR") {
    return "Check your email and password, then try again.";
  }
  if (code === "FORBIDDEN") {
    return "Your security check expired. Refresh the page and try again.";
  }
  if (status >= 500 || code === "UPSTREAM_UNAVAILABLE") {
    return "Authentication is temporarily unavailable. Please try again shortly.";
  }

  return "We couldn't complete that sign-in request. Please review your details and try again.";
}
