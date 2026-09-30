"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "./actions";

export default function SignupPage() {
  const [error, formAction, pending] = useActionState(signup, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Team registrieren</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="teamName">Teamname</Label>
              <Input id="teamName" name="teamName" type="text" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Wird erstellt…" : "Registrieren"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm">
          <p>
            Bereits registriert?{" "}
            <Link href="/login" className="underline">
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
