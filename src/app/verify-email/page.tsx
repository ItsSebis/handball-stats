import Link from "next/link";
import { verifyEmailWithToken } from "@/lib/auth-token";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailWithToken(token) : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {ok ? "E-Mail bestätigt" : "Link ungültig oder abgelaufen"}
      </h1>
      <p className="text-sm">
        {ok
          ? "Danke, deine E-Mail-Adresse wurde bestätigt."
          : "Dieser Bestätigungslink wurde bereits verwendet oder ist abgelaufen."}
      </p>
      <Link href="/dashboard" className="underline">
        Zum Dashboard
      </Link>
    </main>
  );
}
