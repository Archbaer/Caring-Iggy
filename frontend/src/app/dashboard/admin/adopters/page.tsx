import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
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
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Adopter records</p>
          <h1 className="page-title">Adopter management</h1>
          <p className="page-copy">
            The adopter directory could not be loaded right now. Please try again in a moment.
          </p>
        </section>

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Directory error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">We couldn&apos;t load adopter records.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Adopter records</p>
        <h1 className="page-title">Adopter management</h1>
        <p className="page-copy">
          View and manage adopter profiles, track adoption history, and monitor interested animals across all accounts.
        </p>
      </section>

      {result.adopters.length > 0 ? (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          {result.adopters.map((adopter) => (
            <Card key={adopter.id} variant="route">
              <span className="ci-badge">{adopter.status}</span>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">{adopter.name}</h2>
              <p className="text-sm text-[var(--color-ink-soft)]">
                {adopter.email} · {adopter.telephone}
              </p>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Interested animals saved: {adopter.interestCount}
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionLink href={`/dashboard/admin/adopters/${adopter.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">No adopter records</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">No adopter profiles yet.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
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
