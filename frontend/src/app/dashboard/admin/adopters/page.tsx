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
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 animate-fade-up">
          <Eyebrow>Adopter records</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Adopter management
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            The adopter directory could not be loaded right now. Please try again in a moment.
          </p>
        </section>

        <section className="my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 text-center">
          <Eyebrow>Directory error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
            We couldn&apos;t load adopter records.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      {/* Hero header */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 animate-fade-up">
        <div className="flex flex-col gap-2">
          <Eyebrow>Adopter records</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Adopter management
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            View and manage adopter profiles, track adoption history, and monitor interested animals across all accounts.
          </p>
        </div>
      </section>

      {result.adopters.length > 0 ? (
        <section className="my-6 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4 animate-fade-up delay-1">
          {result.adopters.map((adopter) => (
            <Card key={adopter.id} variant="route">
              <Eyebrow>{adopter.status}</Eyebrow>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-2">
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
        <section className="my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 text-center">
          <Eyebrow>No adopter records</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
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
