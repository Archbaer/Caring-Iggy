export default function Home() {
  const highlights = [
    {
      title: "Adaptive Drum Logic",
      text: "TENMA senses fabric weight and water density 200 times per cycle for cleaner results with less wear.",
    },
    {
      title: "Quiet Vector Motor",
      text: "A magnet-balanced core keeps vibration low enough for midnight washes in compact apartments.",
    },
    {
      title: "32% Energy Reduction",
      text: "Heat-recapture and precision rinse timing cut power and water usage without sacrificing performance.",
    },
  ];

  const specs = [
    { label: "Capacity", value: "10 kg" },
    { label: "Spin", value: "1,600 rpm" },
    { label: "Noise", value: "42 dB" },
    { label: "Cycle Time", value: "38 min" },
  ];

  return (
    <main className="relative isolate flex-1 overflow-hidden">
      <div className="pointer-events-none absolute -top-36 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(91,176,210,0.34)_0%,_rgba(242,245,247,0)_68%)]" />

      <section className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-14 pt-20 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pt-24">
        <div className="space-y-8 reveal">
          <p className="inline-flex items-center rounded-full border border-[var(--tenma-border)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--tenma-muted)]">
            TENMA // Smart Laundry
          </p>

          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              Wash with
              <span className="block text-[var(--tenma-accent)]">
                precision, not guesswork.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-8 text-[var(--tenma-muted)] md:text-lg">
              TENMA is the intelligent washing machine that calibrates every
              cycle in real time. Less noise, less water, and fabric care tuned
              to each load.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm font-semibold sm:flex-row">
            <button className="rounded-full bg-[var(--tenma-ink)] px-7 py-3 text-[var(--tenma-canvas)] transition-transform duration-300 hover:-translate-y-0.5">
              Pre-order TENMA
            </button>
            <button className="rounded-full border border-[var(--tenma-border)] bg-white/80 px-7 py-3 text-[var(--tenma-ink)] backdrop-blur transition-colors duration-300 hover:bg-white">
              Watch 45s Demo
            </button>
          </div>
        </div>

        <article className="reveal reveal-delay-1 relative overflow-hidden rounded-[2.2rem] border border-[var(--tenma-border)] bg-[linear-gradient(160deg,#ffffff_0%,#f0f4f7_100%)] p-8 shadow-[0_30px_70px_-45px_rgba(4,30,52,0.65)] md:p-10">
          <div className="absolute right-4 top-4 rounded-full border border-[var(--tenma-border)] bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--tenma-muted)]">
            Launch Edition
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-xs flex-col items-center gap-5 rounded-[1.8rem] border border-[var(--tenma-border)] bg-[linear-gradient(180deg,#f7fbff_0%,#eaf2f9_100%)] px-8 py-8">
            <div className="grid h-44 w-44 place-items-center rounded-full border-[10px] border-[#d8e6f2] bg-[radial-gradient(circle,#a7c7dc_0%,#7298b7_62%,#6e95b4_100%)] shadow-inner">
              <div className="h-20 w-20 rounded-full border border-white/50 bg-white/20" />
            </div>
            <div className="w-full rounded-2xl bg-white/75 px-4 py-4 text-sm text-[var(--tenma-muted)]">
              <p className="font-semibold text-[var(--tenma-ink)]">Auto Flow</p>
              <p>Load detected: 6.2 kg // Eco+ mode</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {specs.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--tenma-border)] bg-white/85 px-4 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--tenma-muted)]">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--tenma-ink)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-6 pb-20 md:grid-cols-3 md:px-10">
        {highlights.map((item, index) => (
          <article
            key={item.title}
            className={`reveal rounded-3xl border border-[var(--tenma-border)] bg-white/80 p-6 shadow-[0_18px_40px_-35px_rgba(3,24,45,0.9)] backdrop-blur ${
              index === 1 ? "reveal-delay-1" : index === 2 ? "reveal-delay-2" : ""
            }`}
          >
            <h2 className="text-base font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--tenma-muted)]">
              {item.text}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
