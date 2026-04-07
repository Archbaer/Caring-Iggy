"use client";

import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <section className="support-shell">
      <p className="eyebrow">Dashboard error</p>
      <h1 className="not-found-title">Protected route shell failed.</h1>
      <p className="support-copy">
        {error.message || "The dashboard scaffold hit an unexpected error."}
      </p>
      <div className="support-actions">
        <button type="button" className="primary-link" onClick={reset}>
          Retry dashboard
        </button>
        <Link href="/dashboard" className="secondary-link">
          Reload dashboard
        </Link>
      </div>
    </section>
  );
}
