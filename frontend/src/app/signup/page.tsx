import { redirect } from "next/navigation";
import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentSession } from "@/lib/auth/server-session";
import { resolveAuthenticatedRedirect } from "@/lib/auth/role-check";
import { readQueryValue } from "@/lib/utils/url";

type PageProps = {
  searchParams: Promise<{
    redirect?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    getCurrentSession(),
    searchParams,
  ]);
  const requestedRedirect = readQueryValue(resolvedSearchParams.redirect);

  if (session) {
    redirect(resolveAuthenticatedRedirect(session, requestedRedirect));
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* LEFT: Dark brand panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-center px-16 py-20" style={{ background: 'var(--gradient-hero)' }}>
        <Link href="/" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white mb-16">
          🐾 Caring Iggy
        </Link>
        <h2 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-white mb-4">
          Every animal deserves<br/>a loving home.
        </h2>
        <p className="text-blue-200 text-base leading-relaxed">
          Join our community and help us make a difference.
        </p>
        <div className="mt-16 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-6">
          <p className="text-white/80 text-sm">&ldquo;Adopting through Caring Iggy was the best decision we ever made.&rdquo;</p>
          <p className="text-white/50 text-xs mt-2">— The Johnson Family</p>
        </div>
      </div>

      {/* RIGHT: Form panel — white */}
      <div className="flex flex-col items-center justify-center px-8 py-16 bg-white">
        {/* Mobile-only back link */}
        <Link href="/" className="lg:hidden mb-8 text-sm text-[var(--color-accent)] font-semibold">← Back to home</Link>

        <div className="w-full max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Create your account
          </h1>
          <p className="text-[var(--color-ink-soft)] mb-8">
            Join the Caring Iggy community.
          </p>

          {/* SignupForm component — keep imported, keep logic */}
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
