import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8" aria-busy="true">
      <Skeleton variant="hero" className="mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Skeleton variant="text" className="h-20" />
        <Skeleton variant="text" className="h-20" />
        <Skeleton variant="text" className="h-20" />
        <Skeleton variant="text" className="h-20" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );
}
