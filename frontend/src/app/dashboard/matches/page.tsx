export default function DashboardMatchesPage() {
  return (
    <div className="page-shell">
      <section className="empty-state">
        <p className="eyebrow">Protected route</p>
        <h1 className="page-title">Matches are coming soon.</h1>
        <p className="page-copy">
          The plan defers live matching UI until backend payload reliability is
          fixed. This stable placeholder keeps the route present without faking data.
        </p>
      </section>
    </div>
  );
}
