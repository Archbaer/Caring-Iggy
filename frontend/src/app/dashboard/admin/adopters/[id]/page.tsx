type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAdopterDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">Adopter detail shell.</h1>
        <p className="page-copy">
          Dynamic record route scaffold for <strong>{id}</strong>. Data loading,
          access checks, and edit flows arrive in the admin task.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Reserved fields</p>
          <h2 className="panel-title">Profile and adoption history</h2>
          <p className="panel-copy">
            This slot will later hold linked account details, preferences, and
            interested animal summaries.
          </p>
        </article>
      </section>
    </div>
  );
}
