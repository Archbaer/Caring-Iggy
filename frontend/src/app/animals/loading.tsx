import { Skeleton } from "@/components/ui/skeleton";

export default function AnimalsLoading() {
  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8" aria-busy="true">
      <Skeleton variant="hero" className="mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );
}
