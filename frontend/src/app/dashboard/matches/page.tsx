import Link from "next/link";
import { redirect } from "next/navigation";

import { LOGIN_ROUTE } from "@/lib/auth/role-check";
import { getCurrentSession } from "@/lib/auth/server-session";

export default async function DashboardMatchesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(`${LOGIN_ROUTE}?redirect=/dashboard/matches`);
  }

  return (
    <>
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 max-w-[var(--max-width-content)] mx-auto text-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Coming soon</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] mb-4">Matching is coming.</h1>
          <p
            className="text-base leading-relaxed text-[var(--color-ink-soft)] mb-5 max-w-[64ch] mx-auto"
          >
            Our matching feature is being built with care. When it arrives, you&apos;ll be able to
            see animal-adopter matches curated by our staff.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-full font-[family-name:var(--font-body)] font-semibold text-[0.9375rem] cursor-pointer transition-all duration-[180ms] no-underline border-none leading-none bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] hover:-translate-y-px hover:shadow-[var(--shadow-md)]">Back to dashboard</Link>
            <Link href="/animals" className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-full font-[family-name:var(--font-body)] font-semibold text-[0.9375rem] cursor-pointer transition-all duration-[180ms] no-underline border-none leading-none bg-transparent border-[1.5px] border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]">Browse animals</Link>
          </div>
        </section>
      </div>
    </>
  );
}
