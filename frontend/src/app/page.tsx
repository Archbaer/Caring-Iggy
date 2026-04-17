import Link from "next/link";
import Image from "next/image";

import { AnimalCard } from "@/components/animals/animal-card";
import { fetchAnimalsForView } from "@/lib/api/animals";

export const dynamic = "force-dynamic";

const trustPoints = [
  {
    title: "No-kill shelter",
    copy: "Every animal in our care receives lifetime commitment, no exceptions.",
  },
  {
    title: "200+ placements",
    copy: "Since opening our doors in 2018, we have successfully matched animals with families.",
  },
  {
    title: "Staff-guided matching",
    copy: "Our team helps you find the right companion based on your lifestyle and home environment.",
  },
];

const processSteps = [
  {
    title: "Browse available animals",
    copy: "Filter by species, age, and temperament to find animals that match your home and lifestyle.",
  },
  {
    title: "Create an account",
    copy: "Sign up to save your favourite animals and tell our team about your living situation and preferences.",
  },
  {
    title: "Meet your match",
    copy: "Once approved, we arrange a visit so you can meet the animal before finalising the adoption.",
  },
];

const testimonials = [
  {
    quote: "The process was incredibly smooth. We fell in love with Luna the moment we met her.",
    adopter: "Sarah M.",
    animal: "Luna (Cat)",
  },
  {
    quote: "Max has brought so much joy to our family. The team really understood what we were looking for.",
    adopter: "James K.",
    animal: "Max (Dog)",
  },
  {
    quote: "I was nervous about adopting an older cat, but the staff helped me find the perfect match.",
    adopter: "Elena R.",
    animal: "Whiskers (Cat)",
  },
];

const values = [
  {
    title: "Transparent profiles",
    copy: "Real temperaments, real history, real photos.",
  },
  {
    title: "Ongoing support",
    copy: "We stay in touch after adoption to ensure everyone thrives.",
  },
  {
    title: "Community first",
    copy: "We partner with local vets, trainers, and volunteers.",
  },
];

async function loadFeaturedAnimals() {
  try {
    const animals = await fetchAnimalsForView({ status: "AVAILABLE" });
    return animals.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function Home() {
  const featuredAnimals = await loadFeaturedAnimals();

  return (
    <>
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[var(--color-canvas)]">
        {/* Warm atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-pale)] via-[var(--color-canvas)] to-[var(--color-primary-pale)] opacity-60" />
        <div className="absolute -top-40 -right-40 w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-[var(--color-accent-pale)] to-transparent opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[var(--color-primary-pale)] to-transparent opacity-40 blur-3xl" />

        <div className="relative z-10 w-full max-w-[var(--max-width-wide)] mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="ci-hero-reveal">
            <p className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-pale)]/60 text-[var(--color-accent)] text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.12em]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              San Francisco Animal Shelter
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.0] tracking-[-0.03em] text-[var(--color-ink)] mb-6">
              Every animal deserves a home.
            </h1>
            <p className="text-lg text-[var(--color-ink-soft)] leading-relaxed max-w-[48ch] mb-10">
              Caring Iggy connects adopted animals with loving families through a transparent,
              guided adoption process. Browse our current residents, learn their stories,
              and take the first step toward welcoming a new companion.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/animals"
                className="ci-btn ci-btn--primary ci-btn--lg rounded-full px-8 py-4 text-base font-semibold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
              >
                Meet our animals
              </Link>
              <Link
                href="/about"
                className="ci-btn ci-btn--ghost ci-btn--lg rounded-full px-8 py-4 text-base font-semibold border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
              >
                Learn about us
              </Link>
            </div>
          </div>

          {/* Hero image */}
          {featuredAnimals[0] && featuredAnimals[0].imageUrl ? (
            <div className="ci-hero-image-reveal relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5]">
                <Image
                  src={featuredAnimals[0].imageUrl}
                  alt={featuredAnimals[0].name}
                  fill
                  sizes="(max-width: 1024px) 90vw, 50vw"
                  style={{ objectFit: "cover" }}
                  priority
                />
                {/* Warm overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/20 via-transparent to-transparent" />
              </div>
              {/* Decorative accent card */}
              <div className="absolute -bottom-5 -left-5 lg:-left-8 bg-[var(--color-surface)] rounded-2xl shadow-xl p-4 border border-[var(--color-border)]">
                <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.1em] text-[var(--color-accent)] mb-1">
                  Currently available
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
                  {featuredAnimals.length}+ animals
                </p>
              </div>
            </div>
          ) : (
            <div className="ci-hero-image-reveal relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[var(--color-primary-pale)] via-[var(--color-accent-pale)] to-[var(--color-canvas)] flex items-center justify-center">
                <span className="font-[family-name:var(--font-display)] text-5xl text-[var(--color-primary)] opacity-30">
                  CI
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Trust Bar ──────────────────────────────────────────────────── */}
      <div className="ci-trust-bar-reveal bg-[var(--color-surface-warm)] border-t border-b border-[var(--color-border)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-5 flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-10 justify-between items-start sm:items-center">
          {trustPoints.map((point, i) => (
            <div key={point.title} className={`flex items-start gap-3 delay-${i + 1}`}>
              <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--color-primary-pale)] text-[var(--color-primary)] flex items-center justify-center">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)] mb-0.5">{point.title}</p>
                <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">{point.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Featured Animals ────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto">
          <div className="mb-12 delay-1">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Currently available
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-4">
              Animals looking for homes.
            </h2>
            <p className="text-base text-[var(--color-ink-soft)] leading-relaxed max-w-[55ch]">
              These animals are ready for adoption now. Browse their profiles to learn more about their personality and needs.
            </p>
          </div>

          {featuredAnimals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 delay-2">
              {featuredAnimals.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.1em] text-[var(--color-ink-faint)] mb-2">No animals available</p>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">Check back soon.</h3>
              <p className="text-[var(--color-ink-soft)]">New animals arrive regularly.</p>
            </div>
          )}

          <div className="mt-12 flex justify-center">
            <Link href="/animals" className="ci-btn ci-btn--primary ci-btn--lg rounded-full px-10 py-4 text-base font-semibold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
              View all available animals
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How Adoption Works ──────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-surface-warm)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto">
          <div className="mb-14">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Our approach
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-4">
              How adoption works.
            </h2>
            <p className="text-base text-[var(--color-ink-soft)] leading-relaxed max-w-[55ch]">
              We take time to make the right match — for you and for the animal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            {processSteps.map((step, index) => (
              <div key={step.title} className={`relative pl-8 delay-${index + 1}`}>
                <span className="absolute -left-1 top-0 font-[family-name:var(--font-display)] text-7xl font-medium text-[var(--color-primary-pale)] leading-none select-none">
                  0{index + 1}
                </span>
                <div className="relative pt-10">
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[var(--color-ink-soft)] leading-relaxed">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto">
          <div className="mb-14 text-center">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Happy tails
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)]">
              Families who found their companion.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={t.adopter} className={`
                rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6
                shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300
                delay-${i + 1}
              `}>
                <p className="font-[family-name:var(--font-display)] text-lg italic text-[var(--color-ink)] leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="font-semibold text-sm text-[var(--color-ink)]">{t.adopter}</p>
                <p className="text-xs text-[var(--color-ink-faint)]">Adopted {t.animal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Values Band ─────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-surface-warm)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Our commitment
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.1] tracking-[-0.02em] text-[var(--color-ink)] mb-8">
              Every animal deserves care.
            </h2>
            <div className="space-y-6">
              {values.map((value, i) => (
                <div key={value.title} className={`delay-${i + 1}`}>
                  <p className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-1">
                    {value.title}
                  </p>
                  <p className="text-[var(--color-ink-soft)] leading-relaxed">{value.copy}</p>
                </div>
              ))}
            </div>
            <Link href="/about" className="mt-8 inline-flex items-center gap-2 font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-deep)] transition-colors duration-200 group">
              Learn about us
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform duration-200">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="relative h-72 sm:h-80 lg:h-96 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[var(--color-primary-pale)] to-[var(--color-accent-pale)]">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl text-[var(--color-primary)] opacity-20">
                CI
              </span>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-8 right-8 w-24 h-24 rounded-full bg-[var(--color-surface)]/20" />
            <div className="absolute bottom-10 left-10 w-16 h-16 rounded-full bg-[var(--color-accent)]/20" />
          </div>
        </div>
      </section>

      {/* ─── CTA Band ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-primary)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto text-center">
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-white mb-5">
            Ready to meet your new companion?
          </h2>
          <p className="text-base text-white/75 max-w-[50ch] mx-auto mb-10">
            Browse our animals and take the first step toward welcoming a new friend.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/animals" className="ci-btn ci-btn--white ci-btn--lg rounded-full px-10 py-4 text-base font-semibold hover:bg-[var(--color-canvas)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
              Browse animals
            </Link>
            <Link href="/about" className="ci-btn ci-btn--lg rounded-full px-10 py-4 text-base font-semibold border-2 border-white/50 text-white hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
              Learn about us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
