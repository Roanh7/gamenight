/** Wordt direct getoond bij een klik, terwijl de pagina laadt. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Laden">
      <p className="pixel mb-5 text-[10px] text-red">
        LOADING<span className="blink">…</span>
      </p>
      <div className="space-y-3">
        <div className="card h-24 animate-pulse bg-soft/60" />
        <div className="card h-16 animate-pulse bg-soft/60" />
        <div className="card h-16 animate-pulse bg-soft/60" />
        <div className="card h-16 animate-pulse bg-soft/60" />
      </div>
    </div>
  );
}
