type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStaffDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">Staff detail shell.</h1>
        <p className="page-copy">
          Dynamic staff route scaffold for <strong>{id}</strong>, reserved for
          future account controls and role-aware management details.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Reserved fields</p>
          <h2 className="panel-title">Identity and role metadata</h2>
          <p className="panel-copy">
            This page intentionally stays free of business actions until the admin
            implementation task adds real data and permission checks.
          </p>
        </article>
      </section>
    </div>
  );
}
