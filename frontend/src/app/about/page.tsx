import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter } from "@/components/layout/public-footer";

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
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Patience",
    copy:
      "We never rush an adoption. Every family and every animal deserves time. If today isn't the right moment, we'll wait. If next month is better, we'll be here.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
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
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
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
      <section
        style={{
          position: "relative",
          height: "clamp(400px, 50vh, 560px)",
          overflow: "hidden",
          background: "var(--color-surface-warm)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, var(--color-surface-warm) 0%, var(--color-primary-pale) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(4rem,10vw,8rem)",
                fontWeight: 400,
                color: "var(--color-primary)",
                opacity: 0.15,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              CI
            </p>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "var(--space-8) var(--space-6)",
            background:
              "linear-gradient(to top, rgba(28,25,23,0.7) 0%, transparent 100%)",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-width-content)",
              margin: "0 auto",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
                margin: "0 0 var(--space-2)",
              }}
            >
              San Francisco Animal Shelter
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.5rem,6vw,5rem)",
                fontWeight: 500,
                color: "white",
                margin: 0,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Our Story
            </h1>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "var(--space-10) var(--space-6)",
          textAlign: "center",
          background: "var(--color-surface)",
        }}
      >
        <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem,3.5vw,2.5rem)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "var(--color-ink)",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              maxWidth: "55ch",
              margin: "0 auto var(--space-5)",
            }}
          >
            &ldquo;Every animal deserves a home where they are loved, safe, and
            understood.&rdquo;
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-ink-faint)",
            }}
          >
            — Our founding principle, 2018
          </p>
        </div>
      </section>

      <section
        style={{
          padding: "var(--space-8) var(--space-6)",
          background: "var(--color-canvas)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-width-content)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-8)",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                margin: "0 0 var(--space-3)",
              }}
            >
              Founded in 2018
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem,4vw,3rem)",
                fontWeight: 500,
                color: "var(--color-ink)",
                margin: "0 0 var(--space-4)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              From one rescue to a community mission.
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <p className="ci-body-lg">
                Caring Iggy began with a simple belief: that every animal
                deserves a home where they are truly understood. What started as
                one woman&apos;s effort to rescue a stray terrier named Iggy has
                grown into a dedicated team of staff, volunteers, and supporters
                working together to find the right match for every animal and
                every family.
              </p>
              <p className="ci-body-lg">
                We take time with every adoption. Our process isn&apos;t fast —
                it&apos;s thorough. We learn about the animals in our care, we
                learn about the families who approach us, and we do our best to
                make introductions that last a lifetime.
              </p>
              <p className="ci-body-lg">
                As a no-kill shelter, we never give up on an animal. Every
                resident in our care receives medical attention, behavioral
                support, and unconditional patience until the right home comes
                along.
              </p>
            </div>
          </div>
          <div
            style={{
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
              aspectRatio: "4 / 5",
              background:
                "linear-gradient(135deg, var(--color-primary-pale) 0%, var(--color-accent-pale) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "4rem",
                fontWeight: 400,
                color: "var(--color-primary)",
                opacity: 0.3,
              }}
            >
              Shelter
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "var(--space-8) var(--space-6)",
          background: "var(--color-surface-warm)",
        }}
      >
        <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                margin: "0 0 var(--space-2)",
              }}
            >
              What guides us
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem,4vw,3rem)",
                fontWeight: 500,
                color: "var(--color-ink)",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Our values
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "var(--space-5)",
            }}
          >
            {VALUES.map((value) => (
              <div
                key={value.title}
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-6)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-primary-pale)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "var(--space-4)",
                    color: "var(--color-primary)",
                  }}
                >
                  {value.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.375rem",
                    fontWeight: 500,
                    color: "var(--color-ink)",
                    margin: "0 0 var(--space-3)",
                  }}
                >
                  {value.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.9375rem",
                    color: "var(--color-ink-soft)",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {value.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "var(--space-8) var(--space-6)",
          background: "var(--color-canvas)",
        }}
      >
        <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                margin: "0 0 var(--space-2)",
              }}
            >
              The people
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem,4vw,3rem)",
                fontWeight: 500,
                color: "var(--color-ink)",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Meet the team
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
              gap: "var(--space-5)",
            }}
          >
            {TEAM_MEMBERS.map((member) => (
              <div key={member.name} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "8rem",
                    height: "8rem",
                    borderRadius: "50%",
                    overflow: "hidden",
                    margin: "0 auto var(--space-3)",
                    background: "var(--color-primary-pale)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "2rem",
                      color: "var(--color-primary)",
                    }}
                  >
                    {member.name.charAt(0)}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.25rem",
                    fontWeight: 500,
                    color: "var(--color-ink)",
                    margin: "0 0 var(--space-1)",
                  }}
                >
                  {member.name}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    color: "var(--color-ink-faint)",
                    margin: 0,
                  }}
                >
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          background: "var(--color-primary)",
          padding: "var(--space-8) var(--space-6)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,4vw,3rem)",
              fontWeight: 500,
              color: "white",
              margin: "0 0 var(--space-4)",
            }}
          >
            Come visit us.
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "1.0625rem",
              maxWidth: "45ch",
              margin: "0 auto var(--space-6)",
            }}
          >
            Mon–Sat 9AM–6PM at 742 Evergreen Terrace, San Francisco. No
            appointment needed for browsing.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/animals"
              className="ci-btn ci-btn--lg"
              style={{
                background: "white",
                color: "var(--color-primary)",
              }}
            >
              Meet our animals
            </Link>
            <a
              href="mailto:hello@caringiggy.org"
              className="ci-btn ci-btn--lg"
              style={{
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.6)",
                color: "white",
              }}
            >
              Contact us
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}