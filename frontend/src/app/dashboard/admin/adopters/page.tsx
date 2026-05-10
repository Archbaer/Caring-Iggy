import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  fetchAdminAdopters,
  type AdminAdopterSummary,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

type AdminAdopterResult =
  | { kind: "success"; adopters: AdminAdopterSummary[] }
  | { kind: "error"; message: string };

export default async function AdminAdoptersPage() {
  await getRequiredRoleSession("ADMIN");
  const result = await loadAdminAdopters();

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8 bg-canvas-pattern">
        {/* Back button */}
        <div className="mb-6">
          <a
            href="/dashboard/admin"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-accent)] font-semibold transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-deep)]"
          >
            ← Dashboard
          </a>
        </div>

        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] mb-8">
          <Eyebrow className="text-[var(--color-accent)]">Adopter records</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Adopter management
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            The adopter directory could not be loaded right now. Please try again in a moment.
          </p>
        </section>

        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] text-center">
          <Eyebrow>Directory error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mb-2">
            We couldn&apos;t load adopter records.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8 bg-canvas-pattern">
      {/* Back button */}
      <div className="mb-6">
        <a
          href="/dashboard/admin"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-accent)] font-semibold transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-deep)]"
        >
          ← Dashboard
        </a>
      </div>

      {/* Hero header */}
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] mb-8">
        <div className="flex flex-col gap-2">
          <Eyebrow className="text-[var(--color-accent)]">Adopter records</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Adopter management
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            View and manage adopter profiles, track adoption history, and monitor interested animals across all accounts.
          </p>
        </div>
      </section>

      {result.adopters.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {result.adopters.map((adopter) => (
            <Card key={adopter.id} variant="route" className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
              <Eyebrow>{adopter.status}</Eyebrow>
              <h2 className="text-xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-2">
                {adopter.name}
              </h2>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
                {adopter.email} · {adopter.telephone}
              </p>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-2">
                Interested animals saved: <span className="font-medium text-[var(--color-ink)]">{adopter.interestCount}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <ActionLink href={`/dashboard/admin/adopters/${adopter.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] text-center">
          <Eyebrow>No adopter records</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mb-2">
            No adopter profiles yet.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Adopter accounts will appear here once registered.
          </p>
        </section>
      )}
    </div>
  );
}

async function loadAdminAdopters(): Promise<AdminAdopterResult> {
  try {
    return {
      kind: "success",
      adopters: await fetchAdminAdopters(),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The adopter directory is temporarily unavailable.",
    };
  }
}
