"use client";

import { useActionState, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { closeGame } from "./actions";

const FORM_ID = "close-game-form";

export function CloseGameForm({ gameId }: { gameId: string }) {
  const [error, formAction, pending] = useActionState(closeGame, undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <form id={FORM_ID} action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="gameId" value={gameId} />
      <div className="flex items-center gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Eigene Tore
          <input
            name="ownScore"
            type="number"
            min={0}
            required
            className="rounded-lg border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Gegner Tore
          <input
            name="opponentScore"
            type="number"
            min={0}
            required
            className="rounded-lg border border-input bg-background px-3 py-2"
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" disabled={pending} onClick={() => setConfirmOpen(true)}>
        {pending ? "Wird beendet…" : "Spiel beenden"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Spiel wirklich beenden?</AlertDialogTitle>
            <AlertDialogDescription>Das kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction type="submit" form={FORM_ID} onClick={() => setConfirmOpen(false)}>
              Spiel beenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
