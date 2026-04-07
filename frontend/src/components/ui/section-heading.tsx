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
  const classes = ["section-heading", className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <p className="section-copy">{copy}</p>
    </header>
  );
}
