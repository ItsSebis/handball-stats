"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeEmail } from "./actions";

export function EmailForm({ email }: { email: string }) {
  const [error, formAction, pending] = useActionState(changeEmail, undefined);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setSaved(true);
      setCurrentPassword("");
      setNewEmail("");
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>E-Mail-Adresse ändern</CardTitle>
        <CardDescription>Aktuell: {email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          onSubmit={() => setSaved(false)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emailCurrentPassword">Aktuelles Passwort</Label>
            <Input
              id="emailCurrentPassword"
              name="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newEmail">Neue E-Mail-Adresse</Label>
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && !pending && <p className="text-sm text-muted-foreground">Gespeichert.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Wird gespeichert…" : "E-Mail-Adresse speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
