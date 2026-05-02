import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donate — Caring Iggy Animal Shelter",
  description:
    "Support Caring Iggy Animal Shelter with a donation. Every contribution helps provide care, food, and love to animals in need.",
};

export default function DonatePage() {
  return (
    <>
      <section className="py-[var(--space-8)] px-6 bg-[var(--color-surface-warm)]">
        <div className="max-w-[var(--max-width-content)] mx-auto">
          <div className="mb-[var(--space-6)]" style={{ textAlign: "center", maxWidth: "70ch", margin: "0 auto" }}>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)]" style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", lineHeight: 1.08, marginBottom: "var(--space-4)" }}>
              Support the animals who need it most.
            </h1>
            <p className="font-[family-name:var(--font-body)] text-[1.0625rem] leading-[1.7] text-[var(--color-ink-soft)]" style={{ color: "var(--color-ink-soft)" }}>
              Every donation helps Caring Iggy provide medical care, warm shelter, nourishing meals,
              and patient love while animals wait for their forever homes.
            </p>
          </div>
        </div>
      </section>

      <section className="py-[var(--space-8)] px-6">
        <div className="max-w-[var(--max-width-content)] mx-auto">
          <div className="mb-[var(--space-6)]" style={{ textAlign: "center" }}>
            <p className="font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.12em] uppercase text-[var(--color-accent)] mb-[var(--space-2)]">Ways to give</p>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[var(--color-ink)] mb-[var(--space-3)] leading-[1.1]">Choose the support path that fits you.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}>
            <article className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-card)] transition-transform duration-[180ms] ease hover:-translate-y-[3px] hover:shadow-[var(--shadow-card-hover)]" style={{ padding: "var(--space-6)" }}>
              <div
                aria-hidden="true"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-primary-pale)",
                  color: "var(--color-primary)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.2] text-[var(--color-ink)]" style={{ marginBottom: "var(--space-2)" }}>One-time donation</h3>
              <p className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.7] text-[var(--color-ink-soft)]">Any amount helps provide food, medicine, and care.</p>
            </article>

            <article className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-card)] transition-transform duration-[180ms] ease hover:-translate-y-[3px] hover:shadow-[var(--shadow-card-hover)]" style={{ padding: "var(--space-6)" }}>
              <div
                aria-hidden="true"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-primary-pale)",
                  color: "var(--color-primary)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                  <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.2] text-[var(--color-ink)]" style={{ marginBottom: "var(--space-2)" }}>Monthly giving</h3>
              <p className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.7] text-[var(--color-ink-soft)]">Become a sustaining supporter and help us plan ahead.</p>
            </article>

            <article className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-card)] transition-transform duration-[180ms] ease hover:-translate-y-[3px] hover:shadow-[var(--shadow-card-hover)]" style={{ padding: "var(--space-6)" }}>
              <div
                aria-hidden="true"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-primary-pale)",
                  color: "var(--color-primary)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.29 7 8.71 5 8.71-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.2] text-[var(--color-ink)]" style={{ marginBottom: "var(--space-2)" }}>In-kind gifts</h3>
              <p className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.7] text-[var(--color-ink-soft)]">Supplies, equipment, and services make a real difference.</p>
            </article>
          </div>
        </div>
      </section>

      <div className="bg-[var(--color-primary)] py-[var(--space-8)] px-6 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-medium text-white mb-[var(--space-4)]">Want to help right now?</h2>
        <p className="text-white/80 text-[1.0625rem] max-w-[50ch] mx-auto mb-[var(--space-6)]">
          Our donation intake page is almost ready. Reach out and our team will guide your support.
        </p>
        <a href="mailto:hello@caringiggy.org?subject=Donation%20inquiry" className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-full font-[family-name:var(--font-body)] font-semibold text-[0.9375rem] cursor-pointer transition-all duration-[180ms] no-underline border-none leading-none bg-white text-[var(--color-primary)] border-[1.5px] border-white hover:bg-[var(--color-primary-pale)] hover:border-[var(--color-primary-pale)] hover:-translate-y-px hover:shadow-[var(--shadow-md)] text-[1.0625rem] py-[0.9375rem] px-7">
          Email our team
        </a>
      </div>
    </>
  );
}
