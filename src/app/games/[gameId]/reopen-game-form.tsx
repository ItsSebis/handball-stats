"use client";

import { useActionState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { reopenGame } from "./actions";

const FORM_ID = "reopen-game-form";

export function ReopenGameForm({ gameId }: { gameId: string }) {
  const [error, formAction, pending] = useActionState(reopenGame, undefined);

  return (
    <AlertDialog>
      <form id={FORM_ID} action={formAction}>
        <input type="hidden" name="gameId" value={gameId} />
      </form>

      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
        {pending ? "Wird geöffnet…" : "Spiel wieder öffnen"}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Spiel wieder öffnen?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Endstand wird entfernt und du kannst wieder Ereignisse erfassen. Um das Spiel erneut abzuschließen,
            musst du den Endstand neu eingeben.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction type="submit" form={FORM_ID} variant="outline">
            Spiel wieder öffnen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
