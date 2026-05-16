import { cn } from "@/lib/utils";

type SkeletonProps = {
  variant?: "card" | "hero" | "text" | "circle";
  className?: string;
};

const variantStyles: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  card:   "rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-warm)] aspect-[4/3] animate-pulse",
  hero:   "rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-warm)] h-32 animate-pulse",
  text:   "rounded-full bg-[var(--color-surface-warm)] h-3 w-3/4 animate-pulse",
  circle: "rounded-full bg-[var(--color-surface-warm)] h-10 w-10 animate-pulse",
};

export function Skeleton({ variant = "text", className }: SkeletonProps) {
  return (
    <div
      className={cn(variantStyles[variant], className)}
      aria-hidden="true"
    />
  );
}
