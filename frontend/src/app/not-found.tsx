import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-4 sm:px-6 pt-20 pb-8">
      <EmptyState
        eyebrow="Not found"
        title="This route does not exist."
        body="Check the URL or head back to the homepage."
        cta={{ href: "/", label: "Back to home" }}
      />
    </div>
  );
}
