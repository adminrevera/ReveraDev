// Squelette affiché dans le contenu du shell pendant le chargement d'un écran.
export default function StudentRouteLoading() {
  return (
    <div className="min-h-[60vh]" aria-busy="true">
      <p className="sr-only">Chargement de la page…</p>
      <div aria-hidden="true" className="animate-pulse">
        <div className="mb-3 h-3 w-28 rounded bg-panel" />
        <div className="mb-3 h-9 w-2/3 max-w-md rounded bg-panel" />
        <div className="mb-8 h-4 w-full max-w-lg rounded bg-panel" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="grid gap-4">
            <div className="h-48 rounded-3xl border border-line bg-panel" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-36 rounded-2xl border border-line bg-panel" />
              <div className="h-36 rounded-2xl border border-line bg-panel" />
            </div>
          </div>
          <div className="grid content-start gap-4">
            <div className="h-40 rounded-2xl border border-line bg-panel" />
            <div className="h-28 rounded-2xl border border-line bg-panel" />
          </div>
        </div>
      </div>
    </div>
  );
}
