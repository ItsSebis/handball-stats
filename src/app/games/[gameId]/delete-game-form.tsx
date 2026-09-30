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
import { deleteGame } from "./actions";

const FORM_ID = "delete-game-form";

export function DeleteGameForm({ gameId }: { gameId: string }) {
  const [error, formAction, pending] = useActionState(deleteGame, undefined);

  return (
    <AlertDialog>
      <form id={FORM_ID} action={formAction}>
        <input type="hidden" name="gameId" value={gameId} />
      </form>

      <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={pending} />}>
        {pending ? "Wird gelöscht…" : "Löschen"}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Spiel wirklich löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Damit werden auch alle erfassten Ereignisse, Statistiken und der Verlauf dieses Spiels unwiderruflich
            gelöscht. Das kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction type="submit" form={FORM_ID} variant="destructive" disabled={pending}>
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
