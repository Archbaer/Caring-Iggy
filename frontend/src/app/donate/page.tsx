import type { Metadata } from "next";

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = {
  title: "Donate — Caring Iggy Animal Shelter",
  description:
    "Support Caring Iggy Animal Shelter with a donation. Every contribution helps provide care, food, and love to animals in need.",
};

export default function DonatePage() {
  return (
    <>
      {/* ─── Animated Donate Hero ───────────────────────────────────────── */}
      <section
        className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden"
        style={{ background: 'var(--gradient-donate-hero)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full border border-white/5 animate-ping"
            style={{ animationDuration: '4s' }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full border border-white/8 animate-ping"
            style={{ animationDuration: '3s', animationDelay: '0.5s' }}
          />
        </div>

        <div className="relative z-10">
          <Eyebrow>Make a difference</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
            Give an animal <span style={{ color: 'var(--color-accent)' }}>a second chance.</span>
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto mb-8">
            Every donation helps Caring Iggy provide medical care, warm shelter, nourishing meals,
            and patient love while animals wait for their forever homes.
          </p>
          <div className="animate-bounce text-white/50 mt-4">↓</div>
        </div>
      </section>

      {/* ─── Ways to Give ───────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[var(--color-canvas)]">
        <div className="max-w-[var(--max-width-content)] mx-auto">
          <div className="mb-12" style={{ textAlign: "center" }}>
            <Eyebrow>Ways to give</Eyebrow>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-0.02em] text-[var(--color-ink)] mb-6 leading-[1.1]">Choose the support path that fits you.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <article className="rounded-3xl bg-white shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-6 flex flex-col items-center text-center hover:scale-105 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
              <div
                aria-hidden="true"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-accent-pale)",
                  color: "var(--color-accent)",
                  marginBottom: "2rem",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-[1.2] text-[var(--color-ink)] mb-4">One-time donation</h3>
              <p className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.7] text-[var(--color-ink-soft)]">Any amount helps provide food, medicine, and care.</p>
            </article>

            <article className="rounded-3xl bg-white shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-6 flex flex-col items-center text-center hover:scale-105 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
              <div
                aria-hidden="true"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-accent-pale)",
                  color: "var(--color-accent)",
                  marginBottom: "2rem",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                  <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-[1.2] text-[var(--color-ink)] mb-4">Monthly giving</h3>
              <p className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.7] text-[var(--color-ink-soft)]">Become a sustaining supporter and help us plan ahead.</p>
            </article>

            <article className="rounded-3xl bg-white shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-6 flex flex-col items-center text-center hover:scale-105 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
              <div
                aria-hidden="true"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-accent-pale)",
                  color: "var(--color-accent)",
                  marginBottom: "2rem",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.29 7 8.71 5 8.71-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-[1.2] text-[var(--color-ink)] mb-4">In-kind gifts</h3>
              <p className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.7] text-[var(--color-ink-soft)]">Supplies, equipment, and services make a real difference.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── CTA Band ───────────────────────────────────────────────────── */}
      <section className="px-6 py-24 relative overflow-hidden" style={{ background: 'var(--gradient-cta)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-[80px]" />
        </div>
        <div className="relative max-w-[var(--max-width-content)] mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-extrabold text-white mb-4">Want to help right now?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
            Our donation page is almost ready. Reach out and our team will guide your support.
          </p>
          <a href="mailto:hello@caringiggy.org?subject=Donation%20inquiry" className="inline-flex items-center gap-2 rounded-2xl bg-white text-[var(--color-accent)] px-10 py-4 text-base font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
            Email our team
          </a>
        </div>
      </section>
    </>
  );
}
