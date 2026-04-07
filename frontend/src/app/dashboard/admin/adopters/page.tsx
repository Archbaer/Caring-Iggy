import Link from "next/link";

export default function AdminAdoptersPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">Adopter management scaffold.</h1>
        <p className="page-copy">
          Reserved for administrator-only adopter records and future detail views.
        </p>
      </section>

      <section className="route-grid">
        {["adopter-001", "adopter-002"].map((id) => (
          <article key={id} className="route-card">
            <span className="status-badge">Admin</span>
            <h2 className="route-card-title">Placeholder record {id}</h2>
            <p className="route-card-copy">
              Detail shells are already routed for deterministic downstream work.
            </p>
            <div className="route-actions">
              <Link href={`/dashboard/admin/adopters/${id}`} className="link-chip">
                Open detail route
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
