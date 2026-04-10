"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthApiError, fetchAuthSession, signup } from "@/lib/api/auth";
import { resolveAuthenticatedRedirect } from "@/lib/auth/role-check";
import type { BffError, SignupRequest } from "@/lib/types";

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
  const [fields, setFields] = useState<SignupRequest>({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<keyof SignupRequest, string[]>>(EMPTY_FIELD_ERRORS);
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
          setErrorMessage("Registration is temporarily unavailable. Refresh and try again.");
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
    setFieldErrors(EMPTY_FIELD_ERRORS);

    try {
      const result = await signup(fields, token);
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
      setFieldErrors(readFieldErrors(error));

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
      <p className="eyebrow">Adopter account</p>
      <h2 className="panel-title">Create your login</h2>
      <p className="panel-copy">
        This public form is limited to adopter registration and posts only to the frontend auth BFF.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-grid">
          <FormField
            id="signup-first-name"
            label="First name"
            name="firstName"
            value={fields.firstName}
            autoComplete="given-name"
            errors={fieldErrors.firstName}
            onChange={(value) => {
              setFields((current) => ({ ...current, firstName: value }));
            }}
          />

          <FormField
            id="signup-last-name"
            label="Last name"
            name="lastName"
            value={fields.lastName}
            autoComplete="family-name"
            errors={fieldErrors.lastName}
            onChange={(value) => {
              setFields((current) => ({ ...current, lastName: value }));
            }}
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
          onChange={(value) => {
            setFields((current) => ({ ...current, email: value }));
          }}
        />

        <FormField
          id="signup-telephone"
          label="Telephone"
          name="telephone"
          type="tel"
          value={fields.telephone}
          autoComplete="tel"
          errors={fieldErrors.telephone}
          onChange={(value) => {
            setFields((current) => ({ ...current, telephone: value }));
          }}
        />

        <FormField
          id="signup-password"
          label="Password"
          name="password"
          type="password"
          value={fields.password}
          autoComplete="new-password"
          errors={fieldErrors.password}
          onChange={(value) => {
            setFields((current) => ({ ...current, password: value }));
          }}
        />

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
            {isPending ? "Creating account..." : "Create adopter account"}
          </button>

          <Link href="/login" className="secondary-link auth-secondary-link">
            Already have an account?
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
    <label className="auth-field" htmlFor={id}>
      <span className="auth-label">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="auth-input"
        value={value}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length > 0 ? errorId : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        required
      />
      {errors.length > 0 ? (
        <span id={errorId} className="auth-field-error">
          {errors[0]}
        </span>
      ) : null}
    </label>
  );
}

function toDisplayMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) {
    return "Registration is temporarily unavailable. Please try again shortly.";
  }

  const responseError = error.responseError;

  if (responseError.code === "VALIDATION_ERROR") {
    return "Check the highlighted fields and try again.";
  }

  if (responseError.code === "FORBIDDEN") {
    return "Your security check expired. Refresh the page and try again.";
  }

  return sanitizeMessage(responseError);
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
  if (!messages || messages.length === 0) {
    return [];
  }

  return [genericFieldMessage(field)];
}

function genericFieldMessage(field: keyof SignupRequest): string {
  switch (field) {
    case "firstName":
      return "Enter a valid first name.";
    case "lastName":
      return "Enter a valid last name.";
    case "email":
      return "Enter a valid email address.";
    case "telephone":
      return "Enter a valid telephone number.";
    case "password":
      return "Enter a valid password.";
  }
}

function sanitizeMessage(error: BffError): string {
  if (error.status >= 500 || error.code === "UPSTREAM_UNAVAILABLE") {
    return "Registration is temporarily unavailable. Please try again shortly.";
  }

  return "We couldn't complete that registration request. Please review the form and try again.";
}
