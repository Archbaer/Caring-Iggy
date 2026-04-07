export default function DashboardPreferencesPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Protected route</p>
        <h1 className="page-title">Preferences route scaffold.</h1>
        <p className="page-copy">
          This page will later host adopter preference fields used by matching.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Planned inputs</p>
          <h2 className="panel-title">Matching-related preferences</h2>
          <ul className="detail-list">
            <li>Animal type and size preferences.</li>
            <li>Breed and temperament fit hints.</li>
            <li>Living situation or adoption constraints.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
