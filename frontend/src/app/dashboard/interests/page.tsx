export default function DashboardInterestsPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Protected route</p>
        <h1 className="page-title">Interested animals scaffold.</h1>
        <p className="page-copy">
          The derived-status view for interested animals will be built here once
          adopter contracts and BFF mutation routes exist.
        </p>
      </section>

      <section className="empty-state">
        <p className="eyebrow">Constraint</p>
        <h2 className="panel-title">Maximum three interested animals in v1.</h2>
        <p className="panel-copy">
          The route shell already reflects the product rule without adding any
          client or server mutation logic yet.
        </p>
      </section>
    </div>
  );
}
