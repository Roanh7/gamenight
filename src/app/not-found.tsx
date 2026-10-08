import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-10 text-center">
      <p className="pixel text-[28px] text-red">404</p>
      <p className="pixel mt-4 text-[11px]">GAME OVER</p>
      <p className="mt-4 font-bold text-muted">Deze pagina bestaat niet (meer).</p>
      <Link href="/" className="btn btn-primary mt-6">
        ▶ Continue
      </Link>
    </div>
  );
}
