import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: { href: string; label: string };
  className?: string;
  variant?: "info" | "error";
};

export function EmptyState({
  eyebrow,
  title,
  body,
  cta,
  className,
  variant = "info",
}: EmptyStateProps) {
  const isError = variant === "error";

  return (
    <div
      className={cn(
        "rounded-3xl border bg-[var(--color-surface)] shadow-[var(--shadow-md)] p-8 sm:p-12 text-center",
        isError ? "border-[var(--color-danger)]/30" : "border-[var(--color-border)]",
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className={cn(
        "font-[family-name:var(--font-display)] text-2xl font-extrabold mb-3 mt-2",
        isError ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
      )}>
        {title}
      </h2>
      {body && (
        <p className="text-[var(--color-ink-soft)] mb-6 max-w-prose mx-auto">
          {body}
        </p>
      )}
      {cta && (
        <Button asChild variant={isError ? "default" : "accent"}>
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
