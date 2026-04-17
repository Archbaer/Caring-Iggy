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
      <section className="ci-hero">
        <div className="ci-hero__copy">
          <p className="ci-hero__eyebrow">San Francisco Animal Shelter</p>
          <h1 className="ci-hero__title">Every animal deserves a home.</h1>
          <p className="ci-hero__copy">
            Caring Iggy connects adopted animals with loving families through a transparent,
            guided adoption process. Browse our current residents, learn their stories,
            and take the first step toward welcoming a new companion.
          </p>
          <div className="ci-hero__actions">
            <a href="/animals" className="ci-btn ci-btn--primary ci-btn--lg">Meet our animals</a>
            <a href="/about" className="ci-btn ci-btn--ghost ci-btn--lg">Learn about us</a>
          </div>
        </div>
        {featuredAnimals[0] && featuredAnimals[0].imageUrl && (
          <div className="ci-hero__image">
            <Image
              src={featuredAnimals[0].imageUrl}
              alt={featuredAnimals[0].name}
              width={600}
              height={750}
              style={{ objectFit: "cover" }}
            />
          </div>
        )}
      </section>

      <div className="ci-trust-bar">
        <div className="ci-trust-bar__inner">
          {trustPoints.map((point, i) => (
            <div key={point.title} className={`ci-trust-item ci-enter ci-enter--${i + 1}`}>
              <div className="ci-trust-item__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: "var(--color-ink)", margin: 0, marginBottom: "0.25rem" }}>{point.title}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-ink-soft)", margin: 0 }}>{point.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="ci-section">
        <div className="ci-section__inner">
          <div className="ci-section__header ci-enter">
            <p className="ci-section__eyebrow">Currently available</p>
            <h2 className="ci-section__title">Animals looking for homes.</h2>
            <p className="ci-section__copy">These animals are ready for adoption now. Browse their profiles to learn more about their personality and needs.</p>
          </div>

          {featuredAnimals.length > 0 ? (
            <div className="ci-animal-grid ci-enter ci-enter--1" style={{ marginBottom: "var(--space-6)" }}>
              {featuredAnimals.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>
          ) : (
            <div className="ci-card" style={{ padding: "var(--space-6)", textAlign: "center", marginBottom: "var(--space-6)" }}>
              <p className="ci-label" style={{ marginBottom: "var(--space-2)" }}>No animals available</p>
              <h3 className="ci-h3" style={{ marginBottom: "var(--space-3)" }}>Check back soon.</h3>
              <p className="ci-body">New animals arrive regularly.</p>
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <a href="/animals" className="ci-btn ci-btn--primary ci-btn--lg">View all available animals</a>
          </div>
        </div>
      </section>

      <section className="ci-section ci-section--warm">
        <div className="ci-section__inner">
          <div className="ci-section__header">
            <p className="ci-section__eyebrow">Our approach</p>
            <h2 className="ci-section__title">How adoption works.</h2>
            <p className="ci-section__copy">We take time to make the right match — for you and for the animal.</p>
          </div>

          <div className="ci-steps">
            {processSteps.map((step, index) => (
              <div key={step.title} className={`ci-enter ci-enter--${index + 1}`}>
                <p className="ci-step__number">0{index + 1}</p>
                <h3 className="ci-step__title">{step.title}</h3>
                <p className="ci-step__copy">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ci-section">
        <div className="ci-section__inner">
          <div className="ci-section__header" style={{ textAlign: "center" }}>
            <p className="ci-section__eyebrow">Happy tails</p>
            <h2 className="ci-section__title">Families who found their companion.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-6)" }}>
            {testimonials.map((t, i) => (
              <div key={t.adopter} className={`ci-card ci-enter ci-enter--${i + 1}`} style={{ padding: "var(--space-5)" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic", color: "var(--color-ink-soft)", lineHeight: 1.6, marginBottom: "var(--space-4)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p style={{ fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>{t.adopter}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-ink-faint)", margin: 0 }}>Adopted {t.animal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ci-section ci-section--warm">
        <div className="ci-section__inner">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)", alignItems: "center" }}>
            <div>
              <p className="ci-section__eyebrow">Our commitment</p>
              <h2 className="ci-section__title" style={{ marginBottom: "var(--space-4)" }}>Every animal deserves care.</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {values.map((value, i) => (
                  <div key={value.title} className={`ci-enter ci-enter--${i + 1}`}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 500, color: "var(--color-ink)", marginBottom: "var(--space-1)" }}>{value.title}</p>
                    <p className="ci-body">{value.copy}</p>
                  </div>
                ))}
              </div>
              <a href="/about" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-4)", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-primary)" }}>
                Learn about us
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>
            <div style={{ aspectRatio: "4/5", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-xl)", background: "linear-gradient(135deg, var(--color-primary-pale) 0%, var(--color-accent-pale) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-primary)", opacity: 0.4 }}>Shelter photo</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ci-cta-band">
        <h2 className="ci-cta-band__title">Ready to meet your new companion?</h2>
        <p className="ci-cta-band__subtitle">Browse our animals and take the first step toward welcoming a new friend.</p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/animals" className="ci-btn ci-btn--white ci-btn--lg">Browse animals</a>
          <a href="/about" className="ci-btn ci-btn--ghost ci-btn--lg" style={{ borderColor: "rgba(255,255,255,0.5)", color: "white" }}>Learn about us</a>
        </div>
      </div>
    </>
  );
}