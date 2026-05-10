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
      <div className="max-w-[80rem] mx-auto bg-canvas-pattern px-6 py-8">
        <section
          className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-8 max-w-[80rem] mx-auto text-center"
        >
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)] mb-2">Coming soon</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-4">Matching is coming.</h1>
          <p
            className="text-base leading-relaxed text-[var(--color-ink-soft)] mb-5 max-w-[64ch] mx-auto"
          >
            Our matching feature is being built with care. When it arrives, you&apos;ll be able to
            see animal-adopter matches curated by our staff.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-full font-[family-name:var(--font-body)] font-semibold text-[0.9375rem] cursor-pointer transition-all duration-[180ms] no-underline border-none leading-none bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] hover:-translate-y-px hover:shadow-[var(--shadow-md)]">Back to dashboard</Link>
            <Link href="/animals" className="inline-flex items-center justify-center gap-2 rounded-full font-[family-name:var(--font-body)] font-semibold text-[0.9375rem] cursor-pointer transition-all duration-[180ms] no-underline border-none leading-none bg-transparent border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]">Browse animals</Link>
          </div>
        </section>
      </div>
    </>
  );
}
