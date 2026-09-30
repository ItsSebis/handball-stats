"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionButtons } from "./action-buttons";
import { EventLog, type GameEventLogEntry } from "./event-log";
import { OnlineStatusBanner } from "./online-status";
import type { Participant } from "./participant";
import { TallyTable } from "../tally-table";
import { useOfflineQueue } from "./use-offline-queue";

export function LiveGameView({
  gameId,
  fieldPlayers,
  keepers,
  showDiscipline,
  eventLog,
}: {
  gameId: string;
  fieldPlayers: Participant[];
  keepers: Participant[];
  showDiscipline: boolean;
  eventLog: GameEventLogEntry[];
}) {
  const offline = useOfflineQueue(gameId, fieldPlayers, keepers, eventLog);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <OnlineStatusBanner
        isOffline={offline.isOffline}
        pendingCount={offline.pendingCount}
        closedElsewhere={offline.closedElsewhere}
      />

      <ActionButtons
        fieldPlayers={offline.fieldPlayers}
        keepers={offline.keepers}
        showDiscipline={showDiscipline}
        onRecordEvent={offline.recordEventOptimistic}
      />

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1">
            Verlauf
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-3">
          <TallyTable fieldPlayers={offline.fieldPlayers} keepers={offline.keepers} showDiscipline={showDiscipline} />
        </TabsContent>
        <TabsContent value="log" className="pt-3">
          <EventLog entries={offline.eventLog} onUndo={offline.undoEventOptimistic} syncingId={offline.syncingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
