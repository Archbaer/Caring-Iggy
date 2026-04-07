import { ActionLink } from "@/components/ui/action-link";

export function PublicFooter() {
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
        <ActionLink href="/signup" variant="chip">
          Start adoption
        </ActionLink>
      </nav>
    </footer>
  );
}
