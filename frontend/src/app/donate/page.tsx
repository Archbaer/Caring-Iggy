import type { Metadata } from "next";

import { PublicFooter } from "@/components/layout/public-footer";

export const metadata: Metadata = {
  title: "Donate — Caring Iggy Animal Shelter",
  description:
    "Support Caring Iggy Animal Shelter with a donation. Every contribution helps provide care, food, and love to animals in need.",
};

export default function DonatePage() {
  return (
    <>
      <section className="ci-section ci-section--warm">
        <div className="ci-section__inner">
          <div className="ci-section__header" style={{ textAlign: "center", maxWidth: "70ch", margin: "0 auto" }}>
            <p className="ci-section__eyebrow">Coming soon</p>
            <h1 className="ci-h1" style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", lineHeight: 1.08, marginBottom: "var(--space-4)" }}>
              Support the animals who need it most.
            </h1>
            <p className="ci-body-lg" style={{ color: "var(--color-ink-soft)" }}>
              Every donation helps Caring Iggy provide medical care, warm shelter, nourishing meals,
              and patient love while animals wait for their forever homes.
            </p>
          </div>
        </div>
      </section>

      <section className="ci-section">
        <div className="ci-section__inner">
          <div className="ci-section__header" style={{ textAlign: "center" }}>
            <p className="ci-section__eyebrow">Ways to give</p>
            <h2 className="ci-section__title">Choose the support path that fits you.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}>
            <article className="ci-card" style={{ padding: "var(--space-6)" }}>
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
              <h3 className="ci-h3" style={{ marginBottom: "var(--space-2)" }}>One-time donation</h3>
              <p className="ci-body">Any amount helps provide food, medicine, and care.</p>
            </article>

            <article className="ci-card" style={{ padding: "var(--space-6)" }}>
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
              <h3 className="ci-h3" style={{ marginBottom: "var(--space-2)" }}>Monthly giving</h3>
              <p className="ci-body">Become a sustaining supporter and help us plan ahead.</p>
            </article>

            <article className="ci-card" style={{ padding: "var(--space-6)" }}>
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
              <h3 className="ci-h3" style={{ marginBottom: "var(--space-2)" }}>In-kind gifts</h3>
              <p className="ci-body">Supplies, equipment, and services make a real difference.</p>
            </article>
          </div>
        </div>
      </section>

      <div className="ci-cta-band">
        <h2 className="ci-cta-band__title">Want to help right now?</h2>
        <p className="ci-cta-band__subtitle">
          Our donation intake page is almost ready. Reach out and our team will guide your support.
        </p>
        <a href="mailto:hello@caringiggy.org?subject=Donation%20inquiry" className="ci-btn ci-btn--white ci-btn--lg">
          Email our team
        </a>
      </div>

      <PublicFooter />
    </>
  );
}
