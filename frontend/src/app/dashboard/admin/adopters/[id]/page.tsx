import { ActionLink } from "@/components/ui/action-link";
import {
  fetchAdminAdopterDetail,
  type AdminAdopterDetail,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AdminAdopterDetailResult =
  | { kind: "success"; adopter: AdminAdopterDetail }
  | { kind: "error"; message: string };

export const dynamic = "force-dynamic";

export default async function AdminAdopterDetailPage({ params }: PageProps) {
  await getRequiredRoleSession("ADMIN");
  const { id } = await params;
  const result = await loadAdminAdopterDetail(id);

  if (result.kind === "error") {
    return (
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Admin route</p>
          <h1 className="page-title">Adopter record unavailable</h1>
          <p className="page-copy">The protected adopter detail route could not be loaded.</p>
        </section>

        <section className="empty-state">
          <p className="eyebrow">Detail error</p>
          <h2 className="panel-title">We couldn&apos;t load this adopter record.</h2>
          <p className="panel-copy">{result.message}</p>
          <ActionLink href="/dashboard/admin/adopters" variant="chip">
            Back to adopter directory
          </ActionLink>
        </section>
      </div>
    );
  }

  const preferenceEntries = Object.entries(result.adopter.preferences);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">{result.adopter.name}</h1>
        <p className="page-copy">
          Administrator-only adopter detail route for <strong>{id}</strong>. Server authorization is rechecked before any record details are rendered.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Profile</p>
          <h2 className="panel-title">Contact and status</h2>
          <ul className="detail-list">
            <li>
              <strong>Email:</strong> {result.adopter.email}
            </li>
            <li>
              <strong>Telephone:</strong> {result.adopter.telephone}
            </li>
            <li>
              <strong>Status:</strong> {result.adopter.status}
            </li>
            <li>
              <strong>Interested animals:</strong> {result.adopter.interestCount}
            </li>
            <li>
              <strong>Address:</strong> {result.adopter.address ?? "No address on file."}
            </li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Preferences</p>
          <h2 className="panel-title">Saved adopter preferences</h2>
          {preferenceEntries.length > 0 ? (
            <ul className="detail-list">
              {preferenceEntries.map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {formatPreferenceValue(value)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-copy">No preferences are stored for this adopter yet.</p>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">History</p>
          <h2 className="panel-title">Adoption history</h2>
          {result.adopter.history.length > 0 ? (
            <ul className="detail-list">
              {result.adopter.history.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.animalName ?? entry.animalId}:</strong>{" "}
                  {entry.adoptionDate ?? "Unknown adoption date"}
                  {entry.returnDate ? ` · Returned ${entry.returnDate}` : ""}
                  {entry.notes ? ` · ${entry.notes}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-copy">No adoption history entries are available for this adopter.</p>
          )}
        </article>
      </section>
    </div>
  );
}

async function loadAdminAdopterDetail(
  id: string,
): Promise<AdminAdopterDetailResult> {
  try {
    return {
      kind: "success",
      adopter: await fetchAdminAdopterDetail(id),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The adopter record is temporarily unavailable.",
    };
  }
}

function formatPreferenceValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ") || "None";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value === null || value === undefined || value === "" ? "None" : String(value);
}
