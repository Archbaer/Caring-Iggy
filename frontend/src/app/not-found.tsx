import Link from "next/link";

export default function NotFound() {
  return (
    <section className="support-shell">
      <p className="eyebrow">Not found</p>
      <h1 className="not-found-title">This Caring Iggy route does not exist.</h1>
      <p className="support-copy">
        The scaffold only includes public, dashboard, and admin routes defined
        in the release plan.
      </p>
      <div className="support-actions">
        <Link href="/" className="primary-link">
          Back to shell home
        </Link>
        <Link href="/animals" className="secondary-link">
          Browse animals route
        </Link>
      </div>
    </section>
  );
}
