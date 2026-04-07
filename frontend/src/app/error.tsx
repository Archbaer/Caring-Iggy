"use client";

import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return (
    <section className="support-shell">
      <p className="eyebrow">Route error</p>
      <h1 className="not-found-title">The shell could not finish rendering.</h1>
      <p className="support-copy">
        {error.message || "An unexpected error interrupted this route."}
      </p>
      <div className="support-actions">
        <button type="button" className="primary-link" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="secondary-link">
          Return home
        </Link>
      </div>
    </section>
  );
}
