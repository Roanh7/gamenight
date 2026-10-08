"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="pt-10 text-center">
      <p className="pixel text-[11px] text-red">OEPS!</p>
      <p className="mt-4 text-xl font-black">Er ging iets mis</p>
      <p className="mt-1 text-sm text-muted">Probeer het nog eens. Blijft het gebeuren? Laat het Roan weten.</p>
      <button onClick={reset} className="btn btn-primary mt-6">
        ↻ Opnieuw
      </button>
    </div>
  );
}
