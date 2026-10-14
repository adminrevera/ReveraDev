export default function FocusLoading() {
  return (
    <div className="min-h-svh" aria-busy="true">
      <p className="sr-only">Chargement…</p>
      <div aria-hidden="true" className="animate-pulse">
        <div className="flex items-center gap-4 border-b border-line px-4 py-3 sm:px-8">
          <div className="size-10 rounded-full bg-panel" />
          <div className="h-2.5 flex-1 rounded-full bg-panel" />
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 px-4 py-9">
          <div className="h-3 w-40 rounded bg-panel" />
          <div className="h-10 w-3/4 rounded bg-panel" />
          <div className="h-40 rounded-2xl border border-line bg-panel" />
          <div className="h-32 rounded-2xl border border-line bg-panel" />
        </div>
      </div>
    </div>
  );
}
