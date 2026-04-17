"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthApiError, fetchAuthSession, signup } from "@/lib/api/auth";
import { resolveAuthenticatedRedirectForRole } from "@/lib/auth/role-check";
import type { SignupRequest } from "@/lib/types";

const EMPTY_FIELD_ERRORS: Record<keyof SignupRequest, string[]> = {
  firstName: [],
  lastName: [],
  email: [],
  telephone: [],
  password: [],
};

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const csrfTokenRef = useRef<string | null>(null);
  const [fields, setFields] = useState<SignupRequest>({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<keyof SignupRequest, string[]>>(EMPTY_FIELD_ERRORS);
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
          setErrorMessage("Registration is temporarily unavailable. Refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitSignup() {
    const token = csrfTokenRef.current ?? (await refreshCsrfToken());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors(EMPTY_FIELD_ERRORS);

    try {
      const result = await signup(fields, token);
      csrfTokenRef.current = result.csrfToken;
      router.replace(
        resolveAuthenticatedRedirectForRole(result.user.role, searchParams.get("redirect")),
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(toDisplayMessage(error));
      setFieldErrors(readFieldErrors(error));

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSignup();
  }

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
      <p className="mb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
        Adopter account
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
        Create your login
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
        This form is limited to adopter registration and posts only to the frontend auth BFF.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="signup-first-name"
            label="First name"
            name="firstName"
            value={fields.firstName}
            autoComplete="given-name"
            errors={fieldErrors.firstName}
            onChange={(value) => setFields((f) => ({ ...f, firstName: value }))}
          />
          <FormField
            id="signup-last-name"
            label="Last name"
            name="lastName"
            value={fields.lastName}
            autoComplete="family-name"
            errors={fieldErrors.lastName}
            onChange={(value) => setFields((f) => ({ ...f, lastName: value }))}
          />
        </div>

        <FormField
          id="signup-email"
          label="Email"
          name="email"
          type="email"
          value={fields.email}
          autoComplete="email"
          errors={fieldErrors.email}
          onChange={(value) => setFields((f) => ({ ...f, email: value }))}
        />

        <FormField
          id="signup-telephone"
          label="Telephone"
          name="telephone"
          type="tel"
          value={fields.telephone}
          autoComplete="tel"
          errors={fieldErrors.telephone}
          onChange={(value) => setFields((f) => ({ ...f, telephone: value }))}
        />

        <FormField
          id="signup-password"
          label="Password"
          name="password"
          type="password"
          value={fields.password}
          autoComplete="new-password"
          errors={fieldErrors.password}
          onChange={(value) => setFields((f) => ({ ...f, password: value }))}
        />

        {errorMessage && (
          <p className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]" aria-live="polite" role="status">
            {errorMessage}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="ci-btn ci-btn--primary rounded-full px-8 py-3 text-sm font-semibold hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait disabled:transform-none transition-all duration-200"
          >
            {isPending ? "Creating account..." : "Create adopter account"}
          </button>
          <Link
            href="/login"
            className="rounded-full border border-[var(--color-border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)] transition-all duration-200"
          >
            Already have an account?
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

type FormFieldProps = {
  id: string;
  label: string;
  name: keyof SignupRequest;
  value: string;
  errors: string[];
  type?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
};

function FormField({
  id,
  label,
  name,
  value,
  errors,
  type = "text",
  autoComplete,
  onChange,
}: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-bold text-[var(--color-ink)]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        className={`
          w-full appearance-none rounded-xl border bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3
          placeholder-[var(--color-ink-faint)]
          focus:outline-none focus:ring-2 transition-all duration-200
          ${errors.length > 0
            ? "border-[var(--color-danger)]/50 focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20"
            : "border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]/20"
          }
        `}
        value={value}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length > 0 ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      {errors.length > 0 && (
        <span id={errorId} className="text-xs text-[var(--color-danger)]">
          {errors[0]}
        </span>
      )}
    </div>
  );
}

function toDisplayMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) {
    return "Registration is temporarily unavailable. Please try again shortly.";
  }

  const { code, status } = error.responseError;

  if (code === "VALIDATION_ERROR") {
    return "Check the highlighted fields and try again.";
  }
  if (code === "FORBIDDEN") {
    return "Your security check expired. Refresh the page and try again.";
  }
  if (status >= 500 || code === "UPSTREAM_UNAVAILABLE") {
    return "Registration is temporarily unavailable. Please try again shortly.";
  }

  return "We couldn't complete that registration request. Please review the form and try again.";
}

function readFieldErrors(error: unknown): Record<keyof SignupRequest, string[]> {
  if (!(error instanceof AuthApiError) || !error.responseError.fieldErrors) {
    return EMPTY_FIELD_ERRORS;
  }

  return {
    firstName: toGenericFieldErrors(error.responseError.fieldErrors.firstName, "firstName"),
    lastName: toGenericFieldErrors(error.responseError.fieldErrors.lastName, "lastName"),
    email: toGenericFieldErrors(error.responseError.fieldErrors.email, "email"),
    telephone: toGenericFieldErrors(error.responseError.fieldErrors.telephone, "telephone"),
    password: toGenericFieldErrors(error.responseError.fieldErrors.password, "password"),
  };
}

function toGenericFieldErrors(
  messages: string[] | undefined,
  field: keyof SignupRequest,
): string[] {
  if (!messages || messages.length === 0) return [];
  return [genericFieldMessage(field)];
}

function genericFieldMessage(field: keyof SignupRequest): string {
  switch (field) {
    case "firstName": return "Enter a valid first name.";
    case "lastName":  return "Enter a valid last name.";
    case "email":     return "Enter a valid email address.";
    case "telephone": return "Enter a valid telephone number.";
    case "password":  return "Enter a valid password.";
  }
}
