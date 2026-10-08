import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Account aanmaken" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/">
          <Logo size="lg" />
        </Link>
      </div>
      <div className="card p-5">
        <p className="pixel mb-2 text-[10px] text-red">NEW PLAYER</p>
        <h1 className="mb-1 text-xl font-black">Maak je speler aan</h1>
        <p className="mb-5 text-sm text-muted">
          Je hebt de uitnodigingscode van de groep nodig.
        </p>
        <SignupForm />
      </div>
      <p className="mt-5 text-center text-sm">
        Al een account?{" "}
        <Link href="/login" className="font-extrabold text-red underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
