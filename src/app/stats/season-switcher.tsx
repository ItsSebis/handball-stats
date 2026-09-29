import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SeasonSwitcher({
  seasons,
  activeSeasonId,
}: {
  seasons: { id: string; label: string }[];
  activeSeasonId: string;
}) {
  return (
    <Tabs value={activeSeasonId} className="w-full">
      <TabsList className="w-full max-w-full justify-start overflow-x-auto">
        <TabsTrigger value="all" nativeButton={false} render={<Link href="/stats?seasonId=all" />}>
          Gesamt
        </TabsTrigger>
        {seasons.map((season) => (
          <TabsTrigger
            key={season.id}
            value={season.id}
            nativeButton={false}
            render={<Link href={`/stats?seasonId=${season.id}`} />}
          >
            {season.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
