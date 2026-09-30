"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [error, formAction, pending] = useActionState(changePassword, undefined);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    wasPending.current = pending;
  }, [pending, error]);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          onSubmit={() => setSaved(false)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmNewPassword">Neues Passwort bestätigen</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          {mismatch && <p className="text-sm text-destructive">Passwörter stimmen nicht überein.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && !pending && <p className="text-sm text-muted-foreground">Gespeichert.</p>}
          <Button type="submit" disabled={pending || mismatch || newPassword.length < 8}>
            {pending ? "Wird gespeichert…" : "Passwort speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
