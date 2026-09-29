export function OnlineStatusBanner({
  isOffline,
  pendingCount,
  closedElsewhere,
}: {
  isOffline: boolean;
  pendingCount: number;
  closedElsewhere: boolean;
}) {
  if (closedElsewhere) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Das Spiel wurde an anderer Stelle beendet. Nicht gespeicherte Ereignisse konnten nicht mehr
        übertragen werden.
      </p>
    );
  }

  if (!isOffline && pendingCount === 0) return null;

  const events = pendingCount === 1 ? "1 Ereignis wird" : `${pendingCount} Ereignisse werden`;

  let message: string;
  if (isOffline && pendingCount > 0) {
    message = `Offline – ${events} synchronisiert, sobald wieder Verbindung besteht.`;
  } else if (isOffline) {
    message = "Offline – Ereignisse werden lokal gespeichert.";
  } else {
    message = `${events} synchronisiert …`;
  }

  return <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>;
}
