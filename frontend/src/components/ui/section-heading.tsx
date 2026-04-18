type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  copy: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
  className,
}: SectionHeadingProps) {
  const classes = ["flex flex-col gap-2", className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">{eyebrow}</p>
      <h2 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h2>
      <p className="text-base text-[var(--color-ink-soft)]">{copy}</p>
    </header>
  );
}
