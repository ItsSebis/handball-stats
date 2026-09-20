import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Handball Stats</h1>
      <div className="flex gap-4">
        <Link href="/login" className="underline">
          Anmelden
        </Link>
        <Link href="/signup" className="underline">
          Registrieren
        </Link>
      </div>
    </main>
  );
}
