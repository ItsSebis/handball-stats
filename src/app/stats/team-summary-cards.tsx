import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeQuote, formatQuote, QUOTES } from "./format-quote";
import type { RawCounters } from "./queries";

export function TeamSummaryCards({ stats }: { stats: RawCounters }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {Object.entries(QUOTES).map(([key, quote]) => (
        <Card key={key} size="sm">
          <CardHeader>
            <CardTitle>{quote.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatQuote(computeQuote(stats[quote.made], stats[quote.attempts]))}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
