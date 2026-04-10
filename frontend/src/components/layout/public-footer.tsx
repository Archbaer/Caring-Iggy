import { ActionLink } from "@/components/ui/action-link";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

export async function PublicFooter() {
  const session = await getCurrentSession();

  return (
    <footer className="shell-footer">
      <div className="footer-meta">
        <p className="footer-title">Caring Iggy</p>
        <p>
          Public pages stay server-first so future auth, dashboard, and admin
          routes can layer in without changing the visual baseline.
        </p>
      </div>

      <nav className="footer-actions" aria-label="Footer links">
        <ActionLink href="/animals" variant="chip">
          Browse animals
        </ActionLink>
        {session ? (
          <ActionLink href={defaultRouteForRole(session.role)} variant="chip">
            {session.role === "ADMIN" ? "Admin workspace" : "Your workspace"}
          </ActionLink>
        ) : (
          <ActionLink href="/signup" variant="chip">
            Start adoption
          </ActionLink>
        )}
      </nav>
    </footer>
  );
}
