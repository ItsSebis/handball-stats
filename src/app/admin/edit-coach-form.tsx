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
import { updateCoach } from "./actions";

export function EditCoachForm({ userId, email }: { userId: string; email: string }) {
  const formId = `edit-coach-${userId}`;
  const [error, formAction, pending] = useActionState(updateCoach, undefined);
  const [open, setOpen] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setOpen(false);
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>Bearbeiten</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konto bearbeiten</AlertDialogTitle>
        </AlertDialogHeader>
        <form id={formId} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="userId" value={userId} />
          <label className="flex flex-col gap-1 text-sm">
            E-Mail
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Rolle
            <select
              name="role"
              defaultValue="COACH"
              className="rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="COACH">Coach</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction type="submit" form={formId} disabled={pending}>
            {pending ? "Wird gespeichert…" : "Speichern"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
