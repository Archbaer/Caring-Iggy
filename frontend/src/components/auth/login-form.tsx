"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthApiError, fetchAuthSession, login } from "@/lib/api/auth";
import { resolveAuthenticatedRedirect } from "@/lib/auth/role-check";
import type { BffError } from "@/lib/types";

type LoginFields = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<LoginFields>({
    email: "",
    password: "",
  });
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchAuthSession()
      .then((session) => {
        if (!cancelled) {
          setCsrfToken(session.csrfToken);
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

    const token = csrfToken ?? (await refreshCsrfToken());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const result = await login(fields, token);
      setCsrfToken(result.csrfToken);
      router.replace(
        resolveAuthenticatedRedirect(
          {
            accountId: result.user.accountId,
            role: result.user.role,
            profileId: result.user.profileId ?? null,
            issuedAt: 0,
            expiresAt: Number.MAX_SAFE_INTEGER,
          },
          searchParams.get("redirect"),
        ),
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(toDisplayMessage(error));

      if (error instanceof AuthApiError && error.responseError.code === "FORBIDDEN") {
        const nextToken = await refreshCsrfToken();

        if (nextToken) {
          setCsrfToken(nextToken);
        }
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="panel auth-panel">
      <p className="eyebrow">Existing account</p>
      <h2 className="panel-title">Sign in</h2>
      <p className="panel-copy">
        Use the email and password tied to your Caring Iggy account.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field" htmlFor="login-email">
          <span className="auth-label">Email</span>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            value={fields.email}
            onChange={(event) => {
              setFields((current) => ({ ...current, email: event.target.value }));
            }}
            required
          />
        </label>

        <label className="auth-field" htmlFor="login-password">
          <span className="auth-label">Password</span>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="auth-input"
            value={fields.password}
            onChange={(event) => {
              setFields((current) => ({ ...current, password: event.target.value }));
            }}
            required
          />
        </label>

        {errorMessage ? (
          <p className="auth-error-banner" aria-live="polite" role="status">
            {errorMessage}
          </p>
        ) : null}

        <div className="auth-actions">
          <button
            type="submit"
            className="auth-submit"
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>

          <Link href="/signup" className="secondary-link auth-secondary-link">
            Need an adopter account?
          </Link>
        </div>
      </form>
    </article>
  );

  async function refreshCsrfToken() {
    try {
      const session = await fetchAuthSession();
      setCsrfToken(session.csrfToken);

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

  const responseError = error.responseError;

  if (responseError.code === "UNAUTHORIZED") {
    return "That email and password combination was not recognized.";
  }

  if (responseError.code === "VALIDATION_ERROR") {
    return "Check your email and password, then try again.";
  }

  if (responseError.code === "FORBIDDEN") {
    return "Your security check expired. Refresh the page and try again.";
  }

  return sanitizeMessage(responseError);
}

function sanitizeMessage(error: BffError): string {
  if (error.status >= 500 || error.code === "UPSTREAM_UNAVAILABLE") {
    return "Authentication is temporarily unavailable. Please try again shortly.";
  }

  return "We couldn't complete that sign-in request. Please review your details and try again.";
}
