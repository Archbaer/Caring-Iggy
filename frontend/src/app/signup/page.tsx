import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Public auth route</p>
        <h1 className="page-title">Adopter sign-up scaffold.</h1>
        <p className="page-copy">
          This route exists for future self-serve adopter registration. Staff and
          admin account provisioning stays outside this public flow.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Planned form</p>
          <h2 className="panel-title">Account creation inputs</h2>
          <p className="panel-copy">
            Name, email, password, and future profile-linking fields will be
            implemented alongside the auth BFF routes.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Access note</p>
          <h2 className="panel-title">Admin and staff are provisioned separately.</h2>
          <p className="panel-copy">
            This protects the route boundary and keeps the public sign-up page
            limited to adopter onboarding.
          </p>
        </article>
      </section>

      <div className="route-actions">
        <Link href="/login" className="secondary-link">
          Already have an account?
        </Link>
      </div>
    </div>
  );
}
