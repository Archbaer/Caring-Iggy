"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthApiError, fetchAuthSession, login } from "@/lib/api/auth";
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
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
      <p className="mb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
        Existing account
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
        Sign in
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
        Use the email and password tied to your Caring Iggy account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-sm font-bold text-[var(--color-ink)]">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.email}
            onChange={(event) => setFields((f) => ({ ...f, email: event.target.value }))}
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="login-password" className="block text-sm font-bold text-[var(--color-ink)]">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
            value={fields.password}
            onChange={(event) => setFields((f) => ({ ...f, password: event.target.value }))}
            required
          />
        </div>

        {/* Error */}
        {errorMessage && (
          <p className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]" aria-live="polite" role="status">
            {errorMessage}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="ci-btn ci-btn--primary rounded-full px-8 py-3 text-sm font-semibold hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait disabled:transform-none transition-all duration-200"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
          <Link
            href="/signup"
            className="rounded-full border border-[var(--color-border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)] transition-all duration-200"
          >
            Need an account?
          </Link>
        </div>
      </form>
    </article>
  );

  async function refreshCsrfToken() {
    try {
      const session = await fetchAuthSession();
      csrfTokenRef.current = session.csrfToken;
      return session.csrfToken;
    } catch {
      return null;
    }
  }
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
