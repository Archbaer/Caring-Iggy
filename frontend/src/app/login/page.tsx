import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Public auth route</p>
        <h1 className="page-title">Login shell for existing accounts.</h1>
        <p className="page-copy">
          The authentication form, redirects, and session checks will be added in
          the dedicated auth task. This page only anchors the route contract.
        </p>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Accounts</p>
          <h2 className="panel-title">Supported roles</h2>
          <ul className="detail-list">
            <li>Adopters sign in to manage interests and preferences.</li>
            <li>Staff sign in for animal-management access later in the plan.</li>
            <li>Admins sign in for adopter and staff management routes.</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Next route</p>
          <h2 className="panel-title">Need an adopter account?</h2>
          <p className="panel-copy">
            Self-serve account creation belongs on the dedicated sign-up route.
          </p>
          <div className="route-actions">
            <Link href="/signup" className="link-chip">
              Go to sign-up scaffold
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
