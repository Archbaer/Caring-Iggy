"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";

type IntakeReport = {
  month: string;
  totalIntake: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
};

type AdoptionReport = {
  month: string;
  totalAdoptions: number;
  byType: Record<string, number>;
};

type ReportState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

const INPUT_CLASS =
  "rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200";

const LABEL_CLASS = "block text-sm font-semibold text-[var(--color-ink)] mb-1.5";

function currentMonth(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${mm}`;
}

function ReportTable({
  rows,
  total,
  totalLabel,
}: {
  rows: [string, number][];
  total: number;
  totalLabel: string;
}) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, count]) => (
          <tr key={label} className="border-b border-[var(--color-border)] last:border-0">
            <td className="py-2.5 text-[var(--color-ink-soft)]">{label}</td>
            <td className="py-2.5 text-right font-semibold text-[var(--color-ink)]">{count}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-[var(--color-border)]">
          <td className="pt-3 font-bold text-[var(--color-ink)]">{totalLabel}</td>
          <td className="pt-3 text-right font-extrabold text-[var(--color-primary)] text-base">{total}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function ReportSection<T>({
  title,
  eyebrow,
  month,
  state,
  onFetch,
  renderContent,
}: {
  title: string;
  eyebrow: string;
  month: string;
  state: ReportState<T>;
  onFetch: (month: string) => void;
  renderContent: (data: T) => React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-8 flex flex-col gap-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mt-1">
          {title}
        </h2>
      </div>

      <div className="flex items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Month</span>
          <input
            type="month"
            className={INPUT_CLASS}
            defaultValue={month}
            max={currentMonth()}
            onChange={(e) => {
              if (e.target.value) onFetch(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center rounded-2xl bg-[var(--color-primary)] text-white px-5 py-3 text-sm font-bold shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-deep)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          disabled={state.status === "loading"}
          onClick={() => onFetch(month)}
        >
          {state.status === "loading" ? "Loading…" : "Load"}
        </button>
      </div>

      {state.status === "error" && (
        <p className="rounded-2xl border-2 border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-4 text-sm text-[var(--color-danger)] font-medium">
          {state.message}
        </p>
      )}

      {state.status === "ok" && renderContent(state.data)}

      {state.status === "idle" && (
        <p className="text-sm text-[var(--color-ink-faint)]">Select a month and click Load.</p>
      )}
    </section>
  );
}

export function ReportsClient() {
  const defaultMonth = currentMonth();
  const [intakeState, setIntakeState] = useState<ReportState<IntakeReport>>({ status: "idle" });
  const [adoptionState, setAdoptionState] = useState<ReportState<AdoptionReport>>({ status: "idle" });

  async function fetchIntake(month: string) {
    setIntakeState({ status: "loading" });
    try {
      const res = await fetch(`/api/reports/intake?month=${month}`, { credentials: "same-origin" });
      const body = await res.json();
      if (!res.ok) {
        setIntakeState({ status: "error", message: body.message ?? "Failed to load intake report." });
      } else {
        setIntakeState({ status: "ok", data: body as IntakeReport });
      }
    } catch {
      setIntakeState({ status: "error", message: "Intake report could not be loaded right now." });
    }
  }

  async function fetchAdoptions(month: string) {
    setAdoptionState({ status: "loading" });
    try {
      const res = await fetch(`/api/reports/adoptions?month=${month}`, { credentials: "same-origin" });
      const body = await res.json();
      if (!res.ok) {
        setAdoptionState({ status: "error", message: body.message ?? "Failed to load adoption report." });
      } else {
        setAdoptionState({ status: "ok", data: body as AdoptionReport });
      }
    } catch {
      setAdoptionState({ status: "error", message: "Adoption report could not be loaded right now." });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <ReportSection
        title="Intake report"
        eyebrow="Animals"
        month={defaultMonth}
        state={intakeState}
        onFetch={fetchIntake}
        renderContent={(data) => (
          <div className="flex flex-col gap-6">
            {Object.keys(data.byType).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide mb-3">By type</p>
                <ReportTable
                  rows={Object.entries(data.byType).sort()}
                  total={data.totalIntake}
                  totalLabel="Total intake"
                />
              </div>
            )}
            {Object.keys(data.byStatus).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide mb-3">By status</p>
                <ReportTable
                  rows={Object.entries(data.byStatus).sort()}
                  total={data.totalIntake}
                  totalLabel="Total intake"
                />
              </div>
            )}
            {data.totalIntake === 0 && (
              <p className="text-sm text-[var(--color-ink-faint)]">No intake records for {data.month}.</p>
            )}
          </div>
        )}
      />

      <ReportSection
        title="Adoption report"
        eyebrow="Adoptions"
        month={defaultMonth}
        state={adoptionState}
        onFetch={fetchAdoptions}
        renderContent={(data) => (
          <div>
            {Object.keys(data.byType).length > 0 ? (
              <ReportTable
                rows={Object.entries(data.byType).sort()}
                total={data.totalAdoptions}
                totalLabel="Total adoptions"
              />
            ) : (
              <p className="text-sm text-[var(--color-ink-faint)]">No adoptions recorded for {data.month}.</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
