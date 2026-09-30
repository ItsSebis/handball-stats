import Link from "next/link";
import { isAuthTokenValid } from "@/lib/auth-token";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = token ? await isAuthTokenValid(token, "PASSWORD_RESET") : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Passwort zurücksetzen</h1>
      {valid && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <p className="text-sm">Dieser Link ist ungültig oder abgelaufen.</p>
          <Link href="/forgot-password" className="underline">
            Neuen Link anfordern
          </Link>
        </>
      )}
    </main>
  );
}
