import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Caring Iggy Animal Shelter — our mission, values, team, and the story behind our no-kill shelter in San Francisco.",
};

const TEAM_MEMBERS = [
  { name: "Maria Chen", role: "Founder & Director" },
  { name: "James Okafor", role: "Head of Adoptions" },
  { name: "Sofia Reyes", role: "Animal Care Lead" },
  { name: "Tom Nakamura", role: "Volunteer Coordinator" },
];

const VALUES = [
  {
    title: "Transparency",
    copy:
      "Honest profiles, real temperaments, no surprises. We tell you exactly what an animal needs to thrive — because the right match requires the full picture.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Patience",
    copy:
      "We never rush an adoption. Every family and every animal deserves time. If today isn't the right moment, we'll wait. If next month is better, we'll be here.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Accountability",
    copy:
      "Post-adoption support is part of every adoption. We check in, we answer questions, and we help navigate challenges — because a good match doesn't end at the door.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <>
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-end overflow-hidden bg-[var(--color-surface-warm)]">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary-pale)]/50 via-[var(--color-surface-warm)] to-[var(--color-accent-pale)]/30" />
        <div className="absolute -top-20 -right-20 w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[var(--color-primary-pale)] to-transparent opacity-40 blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-[var(--color-accent-pale)] to-transparent opacity-30 blur-3xl" />

        {/* Monogram */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <p className="font-[family-name:var(--font-display)] text-[18vw] sm:text-[14vw] font-medium text-[var(--color-primary)] opacity-[0.07] leading-none tracking-[-0.04em]">
            CI
          </p>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-[var(--max-width-wide)] mx-auto px-6 py-16 sm:py-20">
          <div className="ci-hero-reveal">
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              San Francisco Animal Shelter
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)]">
              Our Story
            </h1>
          </div>
        </div>
      </section>

      {/* ─── Mission Quote ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto text-center ci-hero-reveal">
          <div className="relative inline-flex flex-col items-center">
            {/* Decorative quote marks */}
            <span className="absolute -top-6 -left-8 font-[family-name:var(--font-display)] text-[8rem] text-[var(--color-primary-pale)] leading-none select-none pointer-events-none">
              &ldquo;
            </span>
            <blockquote className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-normal italic leading-[1.4] tracking-[-0.01em] text-[var(--color-ink)] max-w-[22ch] mx-auto mb-6">
              Every animal deserves a home where they are loved, safe, and understood.
            </blockquote>
            <cite className="not-italic text-sm text-[var(--color-ink-faint)] font-[family-name:var(--font-mono)] uppercase tracking-[0.1em]">
              — Our founding principle, 2018
            </cite>
          </div>
        </div>
      </section>

      {/* ─── Story ────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="ci-hero-reveal">
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Founded in 2018
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-8">
              From one rescue to a community mission.
            </h2>
            <div className="space-y-5">
              <p className="text-[var(--color-ink-soft)] leading-relaxed text-base">
                Caring Iggy began with a simple belief: that every animal deserves a home where they are truly understood. What started as one woman's effort to rescue a stray terrier named Iggy has grown into a dedicated team of staff, volunteers, and supporters working together to find the right match for every animal and every family.
              </p>
              <p className="text-[var(--color-ink-soft)] leading-relaxed text-base">
                We take time with every adoption. Our process isn't fast — it's thorough. We learn about the animals in our care, we learn about the families who approach us, and we do our best to make introductions that last a lifetime.
              </p>
              <p className="text-[var(--color-ink-soft)] leading-relaxed text-base">
                As a no-kill shelter, we never give up on an animal. Every resident in our care receives medical attention, behavioral support, and unconditional patience until the right home comes along.
              </p>
            </div>
          </div>

          {/* Visual */}
          <div className="ci-hero-image-reveal relative">
            <div className="relative aspect-[5/4] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[var(--color-primary-pale)] via-[var(--color-accent-pale)] to-[var(--color-canvas)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-[family-name:var(--font-display)] text-7xl text-[var(--color-primary)] opacity-20">
                  CI
                </span>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-[var(--color-surface)]/30" />
              <div className="absolute bottom-6 left-6 w-12 h-12 rounded-full bg-[var(--color-accent)]/20" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Values ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-surface-warm)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto">
          <div className="mb-14 text-center delay-1">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              What guides us
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)]">
              Our values
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {VALUES.map((value, i) => (
              <div
                key={value.title}
                className={`
                  group relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8
                  shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300
                  delay-${i + 1}
                `}
              >
                <div className="mb-6 w-12 h-12 rounded-xl bg-[var(--color-primary-pale)] text-[var(--color-primary)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--color-accent-pale)] group-hover:text-[var(--color-accent)] transition-all duration-300">
                  {value.icon}
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[var(--color-ink-soft)] leading-relaxed text-sm">
                    {value.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Team ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto">
          <div className="mb-14">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
              The people
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)]">
              Meet the team
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM_MEMBERS.map((member, i) => (
              <div
                key={member.name}
                className={`
                  group flex flex-col items-center text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8
                  hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300
                  delay-${i + 1}
                `}
              >
                {/* Avatar */}
                <div className="mb-5 w-20 h-20 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] flex items-center justify-center text-3xl font-[family-name:var(--font-display)] font-medium group-hover:bg-[var(--color-accent-pale)] group-hover:text-[var(--color-accent)] transition-all duration-300">
                  {member.name.charAt(0)}
                </div>
                <p className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-1">
                  {member.name}
                </p>
                <p className="text-sm text-[var(--color-ink-faint)]">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Band ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-24 bg-[var(--color-primary)]">
        <div className="max-w-[var(--max-width-wide)] mx-auto text-center ci-hero-reveal">
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-white mb-5">
            Come visit us.
          </h2>
          <p className="text-base text-white/75 max-w-[50ch] mx-auto mb-10">
            Mon–Sat 9AM–6PM at 742 Evergreen Terrace, San Francisco. No appointment needed for browsing.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/animals" className="ci-btn ci-btn--white ci-btn--lg rounded-full px-10 py-4 text-base font-semibold hover:bg-[var(--color-canvas)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
              Meet our animals
            </Link>
            <a
              href="mailto:hello@caringiggy.org"
              className="ci-btn ci-btn--lg rounded-full px-10 py-4 text-base font-semibold border-2 border-white/50 text-white hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
