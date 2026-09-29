import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  backHref,
  actions,
}: {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
      {backHref ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zurück"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          <ArrowLeft />
        </Button>
      ) : (
        <div className="size-8 shrink-0" aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
