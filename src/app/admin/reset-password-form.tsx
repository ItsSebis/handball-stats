"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetCoachPassword } from "./actions";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const formId = `reset-password-${userId}`;
  const [error, formAction, pending] = useActionState(resetCoachPassword, undefined);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setOpen(false);
      setPassword("");
      setConfirmPassword("");
    }
    wasPending.current = pending;
  }, [pending, error]);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Passwort zurücksetzen
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Passwort zurücksetzen</AlertDialogTitle>
        </AlertDialogHeader>
        <form id={formId} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="userId" value={userId} />
          <label className="flex flex-col gap-1 text-sm">
            Neues Passwort
            <input
              name="newPassword"
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Passwort bestätigen
            <input
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
          </label>
          {mismatch && <p className="text-sm text-destructive">Passwörter stimmen nicht überein.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            type="submit"
            form={formId}
            disabled={pending || mismatch || password.length < 8}
          >
            {pending ? "Wird gespeichert…" : "Speichern"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
