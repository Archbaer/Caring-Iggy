export default function DashboardLoading() {
  return (
    <section className="support-shell" aria-live="polite">
      <p className="eyebrow">Dashboard loading</p>
      <h1 className="not-found-title">Preparing protected route scaffolding.</h1>
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </section>
  );
}
