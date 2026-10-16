import { Skeleton } from "@/components/ui/skeleton";

export default function FocusLoading() {
  return (
    <div className="min-h-svh" aria-busy="true">
      <p className="sr-only">Chargement…</p>
      <div aria-hidden="true">
        <div className="flex items-center gap-4 border-b border-line px-4 py-3 sm:px-8">
          <Skeleton className="size-10 rounded-full bg-panel" />
          <Skeleton className="h-2.5 flex-1 rounded-full bg-panel" />
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 px-4 py-9">
          <Skeleton className="h-3 w-40 bg-panel-raised" />
          <Skeleton className="h-10 w-3/4 bg-panel-raised" />
          <Skeleton className="h-40 rounded-2xl border border-line bg-panel" />
          <Skeleton className="h-32 rounded-2xl border border-line bg-panel" />
        </div>
      </div>
    </div>
  );
}
