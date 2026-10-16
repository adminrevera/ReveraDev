import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <main className="min-h-svh" aria-busy="true">
      <p className="sr-only">Préparation de ton inscription…</p>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-4">
          <Skeleton className="size-10 rounded-full bg-panel" />
          <Skeleton className="h-2.5 flex-1 rounded-full bg-panel" />
          <Skeleton className="h-4 w-10 bg-panel-raised" />
        </div>
      </header>
      <section aria-hidden="true" className="mx-auto w-full max-w-[460px] px-5 pt-10">
        <Skeleton className="h-10 w-4/5 bg-panel-raised" />
        <Skeleton className="mt-3 h-4 w-full bg-panel" />
        <div className="mt-8 grid gap-4">
          <Skeleton className="h-14 rounded-2xl border border-line bg-panel" />
          <Skeleton className="h-14 rounded-2xl border border-line bg-panel" />
          <Skeleton className="h-14 rounded-2xl border border-line bg-panel" />
        </div>
      </section>
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 border-t border-line bg-bg px-5 py-3">
        <Skeleton className="mx-auto h-12 max-w-[420px] rounded-full bg-panel-raised" />
      </div>
    </main>
  );
}
