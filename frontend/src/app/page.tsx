import Link from "next/link";

import { AnimalCard } from "@/components/animals/animal-card";
import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { fetchAnimalsForView } from "@/lib/api/animals";

export const dynamic = "force-dynamic";

const trustPoints = [
  {
    title: "Meet before you commit",
    copy: "Every animal profile includes temperament notes, care history, and realistic expectations — so introductions go smoothly.",
  },
  {
    title: "We handle the details",
    copy: "Our team guides medical records, introductions, and placement decisions so you can focus on building a bond.",
  },
  {
    title: "Stay connected",
    copy: "Track your adoption status, save interested animals, and receive updates from the shelter team in one place.",
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
    <div className="page-shell">
      <Card as="section" variant="hero" className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">San Francisco Animal Shelter</p>
          <h1 className="page-title">
            Every animal deserves a home.
          </h1>
          <p className="page-copy">
            Caring Iggy connects adopted animals with loving families through a
            transparent, guided adoption process. Browse our current residents,
            learn their stories, and take the first step toward welcoming a new
            companion.
          </p>

          <div className="hero-actions">
            <ActionLink href="/animals">Meet our animals</ActionLink>
            <ActionLink href="/signup" variant="secondary">
              Create an account
            </ActionLink>
          </div>
        </div>

        <Card className="hero-trust-panel landing-trust-card">
          <p className="eyebrow">Why Caring Iggy</p>
          <h2 className="panel-title">Adoption, not just placement.</h2>
          <p className="panel-copy">
            We believe successful adoptions start with honest profiles, careful
            matching, and ongoing support — not just filling kennels.
          </p>

          <dl className="trust-metrics" aria-label="Trust highlights">
            <div>
              <dt>200+ placements</dt>
              <dd>Since opening our doors in 2018.</dd>
            </div>
            <div>
              <dt>Transparent profiles</dt>
              <dd>Real temperaments, real history, real photos.</dd>
            </div>
            <div>
              <dt>Team support</dt>
              <dd>Dedicated staff guide you through every step.</dd>
            </div>
          </dl>
        </Card>
      </Card>

      <div className="section-divider" aria-hidden="true" />

      <section className="landing-section">
        <SectionHeading
          eyebrow="Currently available"
          title="Animals looking for their forever home."
          copy="These animals are ready for adoption now. Browse their profiles to learn more about their personality and needs."
        />

        {featuredAnimals.length > 0 ? (
          <div className="featured-grid">
            {featuredAnimals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        ) : (
          <Card className="empty-state">
            <p className="eyebrow">No animals available</p>
            <h2 className="panel-title">Check back soon.</h2>
            <p className="panel-copy">
              New animals arrive regularly. Create an account to be notified when
              adoption spots open up.
            </p>
          </Card>
        )}

        <div className="section-cta">
          <ActionLink href="/animals">
            View all available animals
          </ActionLink>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      <section className="landing-section">
        <SectionHeading
          eyebrow="Our approach"
          title="How adoption works at Caring Iggy."
          copy="We take time to make the right match — for you and for the animal."
        />

        <div className="process-grid">
          {processSteps.map((step, index) => (
            <Card key={step.title} className="process-card">
              <p className="process-index">0{index + 1}</p>
              <h3 className="panel-title">{step.title}</h3>
              <p className="panel-copy">{step.copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      <section className="landing-section">
        <SectionHeading
          eyebrow="Shelter values"
          title="What sets us apart."
          copy="We built Caring Iggy around the belief that good adoptions require good information, realistic expectations, and genuine support."
        />

        <div className="panel-grid">
          {trustPoints.map((point) => (
            <Card key={point.title}>
              <p className="eyebrow">Our commitment</p>
              <h3 className="panel-title">{point.title}</h3>
              <p className="panel-copy">{point.copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card as="section" className="cta-band">
        <SectionHeading
          eyebrow="Ready to begin?"
          title="Browse animals waiting for a home."
          copy="Take your time browsing. When you find someone you'd like to know better, create an account and let our team know."
          className="cta-heading"
        />

        <div className="hero-actions cta-actions">
          <ActionLink href="/animals">Meet our animals</ActionLink>
          <ActionLink href="/login" variant="secondary">
            Sign in to your account
          </ActionLink>
        </div>
      </Card>
    </div>
  );
}
