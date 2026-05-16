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
      <section
        className="relative min-h-[92vh] flex items-center justify-center px-6 py-20 overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-[var(--color-accent)]/15 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-[var(--color-primary-pale)]/10 blur-[140px]" />
        </div>

        <div className="relative z-10 lg:grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-[var(--max-width-content)] w-full">
          {/* Left text column */}
          <div className="animate-[hero-reveal_800ms_cubic-bezier(0.22,1,0.36,1)_both]">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)] mb-6">
              Welcome to Caring Iggy
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-white mb-6">
              Every animal deserves a <span style={{ color: 'var(--color-accent)' }}>loving home</span>.
            </h1>
            <p className="text-lg text-blue-200 leading-relaxed max-w-prose mb-10">
              Caring Iggy connects adopted animals with loving families through a transparent,
              guided adoption process. Browse our current residents, learn their stories,
              and take the first step toward welcoming a new companion.
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                href="/animals"
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-accent)] text-white px-8 py-4 text-base font-bold shadow-[var(--shadow-coral)] hover:bg-[var(--color-accent-deep)] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Meet our animals
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 text-white px-8 py-4 text-base font-bold hover:bg-white/10 hover:border-white/70 transition-all duration-300"
              >
                Learn about us
              </Link>
            </div>
          </div>

          {/* Hero image */}
          {featuredAnimals[0] && featuredAnimals[0].imageUrl ? (
            <div className="animate-hero-image-reveal delay-2 relative">
              <div className="overflow-hidden rounded-[2rem] shadow-2xl ring-4 ring-white/10 aspect-[4/5]">
                <Image
                  src={featuredAnimals[0].imageUrl}
                  alt={featuredAnimals[0].name}
                  fill
                  sizes="(max-width: 1024px) 90vw, 50vw"
                  style={{ objectFit: "cover" }}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/20 via-transparent to-transparent" />
              </div>
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
            <div className="animate-hero-image-reveal delay-2 relative">
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white/10 bg-gradient-to-br from-[var(--color-primary-pale)] via-[var(--color-accent-pale)] to-[var(--color-canvas)] flex items-center justify-center">
                <span className="font-[family-name:var(--font-display)] text-5xl text-[var(--color-primary)] opacity-30">
                  CI
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Trust Bar ──────────────────────────────────────────────────── */}
      <div className="px-6 py-6 bg-white border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-[var(--max-width-content)] mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {trustPoints.map((point, i) => (
            <div key={point.title} className={`flex items-center gap-3 delay-${i + 1}`}>
              <span className="text-3xl">🐾</span>
              <div>
                <p className="text-xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">{point.title}</p>
                <p className="text-xs text-[var(--color-ink-soft)] font-medium">{point.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Featured Animals ────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-content)] mx-auto">
          <div className="mb-12 text-center">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)]">
              Meet our animals
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)] mb-12 text-center">
              Animals looking for homes.
            </h2>
          </div>

          {featuredAnimals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <div className="mt-12 text-center">
            <Link href="/animals" className="text-[var(--color-accent)] font-bold text-sm hover:underline">
              View all available animals
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How Adoption Works ──────────────────────────────────────────── */}
      <section
        className="px-6 py-20 sm:py-24"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <div className="max-w-[var(--max-width-content)] mx-auto">
          <div className="mb-12 text-center">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)]">
              How it works
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-white text-center mb-12">
              How adoption works.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {processSteps.map((step, index) => (
              <div key={step.title} className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center delay-${index + 1}`}>
                <span
                  className="text-7xl font-[family-name:var(--font-display)] font-black leading-none select-none"
                  style={{ color: 'var(--color-accent)' }}
                >
                  0{index + 1}
                </span>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-blue-200 leading-relaxed">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-[var(--max-width-content)] mx-auto">
          <div className="mb-14 text-center">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)]">
              Testimonials
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              Families who found their companion.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={t.adopter} className={`rounded-2xl border-l-4 border-[var(--color-accent)] bg-[var(--color-accent-pale)]/30 p-6 delay-${i + 1}`}>
                <p className="text-[var(--color-ink)] italic leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold">
                    {t.adopter.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-ink-soft)]">{t.adopter}</p>
                    <p className="text-xs text-[var(--color-ink-faint)]">Adopted {t.animal}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Values Band ─────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-primary-pale)]">
        <div className="lg:grid lg:grid-cols-2 gap-12 items-center max-w-[var(--max-width-content)] mx-auto">
          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)]">
              Our commitment
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)] mb-4">
              Every animal deserves care.
            </h2>
            <div className="w-12 h-1.5 rounded-full bg-[var(--color-accent)] mb-6" />
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

          <div className="relative h-72 sm:h-80 lg:h-96 rounded-[2rem] ring-4 ring-[var(--color-primary)]/20 overflow-hidden bg-gradient-to-br from-[var(--color-primary-pale)] to-[var(--color-accent-pale)]">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl text-[var(--color-primary)] opacity-20">
                CI
              </span>
            </div>
            <div className="absolute top-8 right-8 w-24 h-24 rounded-full bg-[var(--color-surface)]/20" />
            <div className="absolute bottom-10 left-10 w-16 h-16 rounded-full bg-[var(--color-accent)]/20" />
          </div>
        </div>
      </section>

      {/* ─── CTA Band ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 relative overflow-hidden" style={{ background: 'var(--gradient-cta)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-[80px]" />
        </div>
        <div className="relative max-w-[var(--max-width-content)] mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-extrabold text-white mb-4">
            Ready to meet your new companion?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
            Browse our animals and take the first step toward welcoming a new friend.
          </p>
          <Link href="/animals" className="inline-flex items-center gap-2 rounded-2xl bg-white text-[var(--color-accent)] px-10 py-4 text-base font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
            Browse animals
          </Link>
        </div>
      </section>
    </>
  );
}
