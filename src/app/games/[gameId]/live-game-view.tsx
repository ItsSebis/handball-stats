import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionButtons } from "./action-buttons";
import { EventLog, type GameEventLogEntry } from "./event-log";
import type { Participant } from "./participant";
import { TallyTable } from "./tally-table";

export function LiveGameView({
  fieldPlayers,
  keepers,
  showDiscipline,
  eventLog,
}: {
  fieldPlayers: Participant[];
  keepers: Participant[];
  showDiscipline: boolean;
  eventLog: GameEventLogEntry[];
}) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <ActionButtons fieldPlayers={fieldPlayers} keepers={keepers} showDiscipline={showDiscipline} />

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
          <TallyTable fieldPlayers={fieldPlayers} keepers={keepers} showDiscipline={showDiscipline} />
        </TabsContent>
        <TabsContent value="log" className="pt-3">
          <EventLog entries={eventLog} closed={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
