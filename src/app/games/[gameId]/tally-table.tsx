import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Participant } from "./participant";

function DisciplineBadges({ twoMinPenalties, yellowCard, redCard }: Pick<Participant, "twoMinPenalties" | "yellowCard" | "redCard">) {
  if (!twoMinPenalties && !yellowCard && !redCard) {
    return <span className="text-muted-foreground">–</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {twoMinPenalties > 0 && <Badge variant="secondary">{twoMinPenalties}× 2&apos;</Badge>}
      {yellowCard && <Badge variant="secondary">Gelb</Badge>}
      {redCard && <Badge variant="destructive">Rot</Badge>}
    </div>
  );
}

function ParticipantGroup({
  title,
  participants,
  regularLabel,
  sevenMeterLabel,
  regular,
  sevenMeter,
  showDiscipline,
}: {
  title: string;
  participants: Participant[];
  regularLabel: string;
  sevenMeterLabel: string;
  regular: (p: Participant) => string;
  sevenMeter: (p: Participant) => string;
  showDiscipline: boolean;
}) {
  if (participants.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 px-1 text-sm font-medium">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">Spieler</TableHead>
            <TableHead>{regularLabel}</TableHead>
            <TableHead>{sevenMeterLabel}</TableHead>
            {showDiscipline && <TableHead>Disziplin</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((p) => (
            <TableRow key={p.gameParticipationId}>
              <TableCell className="sticky left-0 bg-background font-medium">{p.name}</TableCell>
              <TableCell>{regular(p)}</TableCell>
              <TableCell>{sevenMeter(p)}</TableCell>
              {showDiscipline && (
                <TableCell>
                  <DisciplineBadges
                    twoMinPenalties={p.twoMinPenalties}
                    yellowCard={p.yellowCard}
                    redCard={p.redCard}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TallyTable({
  fieldPlayers,
  keepers,
  showDiscipline,
}: {
  fieldPlayers: Participant[];
  keepers: Participant[];
  showDiscipline: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ParticipantGroup
        title="Feldspieler"
        participants={fieldPlayers}
        regularLabel="Regulär"
        sevenMeterLabel="7m"
        regular={(p) => `${p.goalsRegular}/${p.shotsRegular}`}
        sevenMeter={(p) => `${p.goals7m}/${p.shots7m}`}
        showDiscipline={showDiscipline}
      />
      <ParticipantGroup
        title="Torhüter"
        participants={keepers}
        regularLabel="Regulär"
        sevenMeterLabel="7m"
        regular={(p) => `${p.savesRegular}/${p.shotsFacedRegular}`}
        sevenMeter={(p) => `${p.saves7m}/${p.shotsFaced7m}`}
        showDiscipline={showDiscipline}
      />
    </div>
  );
}
