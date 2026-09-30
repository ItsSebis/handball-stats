"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [message, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Passwort vergessen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            {message && <p className="text-sm">{message}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Wird gesendet…" : "Link zum Zurücksetzen senden"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm">
          <Link href="/login" className="underline">
            Zurück zur Anmeldung
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
