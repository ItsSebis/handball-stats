import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthTokenValid } from "@/lib/auth-token";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = token ? await isAuthTokenValid(token, "PASSWORD_RESET") : false;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Passwort zurücksetzen</CardTitle>
        </CardHeader>
        <CardContent>
          {valid && token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm">Dieser Link ist ungültig oder abgelaufen.</p>
              <Link href="/forgot-password" className="underline">
                Neuen Link anfordern
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
