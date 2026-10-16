import { Skeleton } from "@/components/ui/skeleton";

export default function StudentRouteLoading() {
  return (
    <div className="mx-auto min-h-[60vh] max-w-6xl py-2" aria-busy="true">
      <p className="sr-only">Chargement de la page…</p>
      <div aria-hidden="true">
        <div className="mb-7 space-y-3">
          <Skeleton className="h-3 w-24 bg-panel-raised" />
          <Skeleton className="h-10 w-2/3 max-w-md bg-panel-raised" />
          <Skeleton className="h-4 w-full max-w-lg bg-panel-raised" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4">
            <Skeleton className="h-48 rounded-3xl border border-line bg-panel" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-36 rounded-2xl border border-line bg-panel" />
              <Skeleton className="h-36 rounded-2xl border border-line bg-panel" />
            </div>
          </div>
          <div className="grid content-start gap-4">
            <Skeleton className="h-40 rounded-2xl border border-line bg-panel" />
            <Skeleton className="h-28 rounded-2xl border border-line bg-panel" />
          </div>
        </div>
      </div>
    </div>
  );
}
