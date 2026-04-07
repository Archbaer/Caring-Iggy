import Link from "next/link";

export default function AdminStaffPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">Staff management scaffold.</h1>
        <p className="page-copy">
          Administrator-only route family for staff account oversight and future
          provisioning flows.
        </p>
      </section>

      <section className="route-grid">
        {["staff-001", "staff-002"].map((id) => (
          <article key={id} className="route-card">
            <span className="status-badge">Admin</span>
            <h2 className="route-card-title">Placeholder staff record {id}</h2>
            <p className="route-card-copy">
              Dynamic detail routes exist now so auth and admin work can layer on
              later without changing the route map.
            </p>
            <div className="route-actions">
              <Link href={`/dashboard/admin/staff/${id}`} className="link-chip">
                Open detail route
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
