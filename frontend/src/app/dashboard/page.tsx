import Link from "next/link";

const dashboardRoutes = [
  {
    href: "/dashboard/preferences",
    title: "Preferences",
    copy: "Future matching preferences editor for adopters.",
  },
  {
    href: "/dashboard/interests",
    title: "Interests",
    copy: "Reserved for the max-three interested animals workflow.",
  },
  {
    href: "/dashboard/matches",
    title: "Matches",
    copy: "Stable coming-soon route until backend matching reliability is fixed.",
  },
];

export default function DashboardPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Protected route</p>
        <h1 className="page-title">Dashboard route scaffold.</h1>
        <p className="page-copy">
          This shell marks the protected adopter workspace without adding
          middleware, session checks, or live data ahead of their dedicated tasks.
        </p>
      </section>

      <section className="route-grid">
        {dashboardRoutes.map((route) => (
          <article key={route.href} className="route-card">
            <span className="status-badge">Protected</span>
            <h2 className="route-card-title">{route.title}</h2>
            <p className="route-card-copy">{route.copy}</p>
            <div className="route-actions">
              <Link href={route.href} className="link-chip">
                Open section
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Adopter scope</p>
          <h2 className="panel-title">Personal adoption workspace</h2>
          <p className="panel-copy">
            Counts, summaries, and mutation actions intentionally wait for typed
            contracts, session utilities, and backend fixes.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Admin scope</p>
          <h2 className="panel-title">Management is route-separated.</h2>
          <p className="panel-copy">
            Admin flows live under dedicated admin paths instead of the generic
            adopter dashboard surface.
          </p>
        </article>
      </section>
    </div>
  );
}
