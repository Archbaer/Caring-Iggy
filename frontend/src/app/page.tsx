import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

const trustPoints = [
  {
    title: "Gentle screening",
    copy: "Families get clear guidance, realistic timelines, and role-aware follow-up instead of a rushed funnel.",
  },
  {
    title: "Transparent care notes",
    copy: "Each profile is designed to surface temperament, medical context, and next-step readiness with plain language.",
  },
  {
    title: "One shared system",
    copy: "Public pages, adopter dashboards, and staff workflows are all being shaped inside one consistent platform.",
  },
];

const featuredAnimals = [
  {
    name: "Maple",
    breed: "Italian Greyhound mix",
    note: "Quiet mornings, blanket burrower, happiest with a patient home.",
    status: "Placeholder profile",
  },
  {
    name: "Juniper",
    breed: "Whippet mix",
    note: "People-oriented, quick learner, ready for a home with steady routines.",
    status: "Placeholder profile",
  },
  {
    name: "Pico",
    breed: "Miniature pinscher mix",
    note: "Small and alert with a playful streak, ideal for adopters wanting an active companion.",
    status: "Placeholder profile",
  },
];

const processSteps = [
  {
    title: "Browse with context",
    copy: "Start with profiles shaped for clarity so you can compare temperament, care needs, and adoption readiness on the server-rendered catalog.",
  },
  {
    title: "Share your fit",
    copy: "Create an adopter account when you are ready to save interests and describe the home, pace, and support you can offer.",
  },
  {
    title: "Move together",
    copy: "Staff use the same platform to guide introductions, confirm readiness, and keep status changes visible without separate tooling.",
  },
];

export default function Home() {
  return (
    <div className="page-shell">
      <Card as="section" variant="hero" className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Calm adoption, carefully guided</p>
          <h1 className="page-title">
            A softer path to meeting the right animal.
          </h1>
          <p className="page-copy">
            Caring Iggy is building one restrained, readable adoption experience
            for visitors, adopters, and shelter staff. The public landing page is
            designed to earn trust first: clear next steps, honest placeholders,
            and a steady invitation into the animal catalog.
          </p>

          <div className="hero-actions">
            <ActionLink href="/animals">Browse available animals</ActionLink>
            <ActionLink href="/signup" variant="secondary">
              Start an adopter profile
            </ActionLink>
          </div>
        </div>

        <Card className="hero-trust-panel landing-trust-card">
          <p className="eyebrow">Why it feels reliable</p>
          <h2 className="panel-title">Built for clarity before conversion.</h2>
          <p className="panel-copy">
            Every public step is intentionally quiet: no browser-side service
            calls, no inflated urgency, and no mismatched flows that would need to
            be rebuilt when auth and dashboard features arrive.
          </p>

          <dl className="trust-metrics" aria-label="Trust highlights">
            <div>
              <dt>Server-first</dt>
              <dd>Fast initial reads and safer future session boundaries.</dd>
            </div>
            <div>
              <dt>Accessible</dt>
              <dd>Readable contrast, clear headings, responsive sections.</dd>
            </div>
            <div>
              <dt>Grounded</dt>
              <dd>Placeholder animals stay honest until catalog data lands.</dd>
            </div>
          </dl>
        </Card>
      </Card>

      <section className="landing-section">
        <SectionHeading
          eyebrow="Mission and trust"
          title="Designed to make adoption feel steady, not overwhelming."
          copy="The first release centers on public confidence: warm narrative, careful information hierarchy, and visible preparation for role-aware workflows that will arrive next."
        />

        <div className="panel-grid">
          {trustPoints.map((point) => (
            <Card key={point.title}>
              <p className="eyebrow">Trust signal</p>
              <h3 className="panel-title">{point.title}</h3>
              <p className="panel-copy">{point.copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <SectionHeading
          eyebrow="Featured animals"
          title="Early profile placeholders that preview the browsing tone."
          copy="These are static server-safe stubs for now. They establish the calm editorial rhythm of the catalog without introducing live microservice reads on the landing page."
        />

        <div className="featured-grid">
          {featuredAnimals.map((animal) => (
            <Card key={animal.name} className="featured-animal-card animal-card">
              <div className="animal-card-media placeholder-animal-media" aria-hidden="true">
                <span>{animal.name.slice(0, 1)}</span>
              </div>
              <div className="animal-card-body">
                <span className="status-badge">{animal.status}</span>
                <h3 className="route-card-title">{animal.name}</h3>
                <p className="animal-breed">{animal.breed}</p>
                <p className="route-card-copy">{animal.note}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <SectionHeading
          eyebrow="Process"
          title="A three-step rhythm that will scale into the full product."
          copy="The landing page introduces the adoption journey in the same order the platform itself is being built: browse first, capture fit second, coordinate with staff third."
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

      <Card as="section" className="cta-band">
        <SectionHeading
          eyebrow="Next step"
          title="When you are ready, the catalog is the best place to begin."
          copy="Browse the animal route now, then return later for account creation, interests, and guided follow-up as the next phases land."
          className="cta-heading"
        />

        <div className="hero-actions cta-actions">
          <ActionLink href="/animals">Go to /animals</ActionLink>
          <ActionLink href="/login" variant="secondary">
            Existing account login
          </ActionLink>
        </div>
      </Card>
    </div>
  );
}
