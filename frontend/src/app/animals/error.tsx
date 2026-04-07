"use client";

import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AnimalsError({ error, reset }: ErrorProps) {
  return (
    <section className="support-shell">
      <p className="eyebrow">Catalog error</p>
      <h1 className="not-found-title">The public animal routes could not finish rendering.</h1>
      <p className="support-copy">
        {error.message || "An unexpected error interrupted the public catalog."}
      </p>
      <div className="support-actions">
        <button type="button" className="primary-link" onClick={reset}>
          Try catalog again
        </button>
        <Link href="/animals" className="secondary-link">
          Reload catalog
        </Link>
      </div>
    </section>
  );
}
