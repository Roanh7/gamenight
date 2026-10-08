import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/">
          <Logo size="lg" />
        </Link>
      </div>
      <div className="card p-5">
        <h1 className="mb-1 text-xl font-black">Welkom terug</h1>
        <p className="mb-5 text-sm text-muted">Log in om verder te spelen.</p>
        <LoginForm next={next} />
      </div>
      <p className="mt-5 text-center text-sm">
        Nog geen account?{" "}
        <Link href="/registreren" className="font-extrabold text-red underline underline-offset-2">
          Maak er een aan
        </Link>
      </p>
    </div>
  );
}
