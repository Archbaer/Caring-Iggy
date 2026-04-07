export default function AnimalsLoading() {
  return (
    <section className="support-shell" aria-live="polite">
      <p className="eyebrow">Catalog loading</p>
      <h1 className="not-found-title">Preparing the public animal catalog.</h1>
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </section>
  );
}
