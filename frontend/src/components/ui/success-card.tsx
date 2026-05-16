"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SuccessField = {
  label: string;
  value: string;
};

type SuccessCardProps = {
  title: string;
  fields: SuccessField[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function SuccessCard({
  title,
  fields,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: SuccessCardProps) {
  const reduceMotion = useReducedMotion();

  const containerVariants = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.01 } } }
    : {
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
            staggerChildren: 0.08,
          },
        },
      };

  return (
    <motion.article
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "rounded-3xl bg-white border border-[var(--color-success)]/30 shadow-[var(--shadow-lg)] p-6 sm:p-8 flex flex-col gap-5",
        className,
      )}
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center text-xl">
          <CheckCircle className="h-6 w-6 text-[var(--color-success)] shrink-0" />
        </div>
        <h2 className="text-xl font-extrabold text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
      </motion.div>

      <motion.ul
        variants={itemVariants}
        className="flex flex-col gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4"
      >
        {fields.map((field) => (
          <li key={field.label} className="flex flex-col gap-0.5 text-sm">
            <span className="text-[var(--color-ink-soft)]">{field.label}</span>
            <span className="font-medium text-[var(--color-ink)]">
              {field.value || "—"}
            </span>
          </li>
        ))}
      </motion.ul>

      <motion.div
        variants={itemVariants}
        className="flex flex-wrap gap-3 pt-1"
      >
        <Button asChild>
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryHref && secondaryLabel ? (
          <Button variant="outline" asChild>
            <Link href={secondaryHref}>
              {secondaryLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </motion.div>
    </motion.article>
  );
}
