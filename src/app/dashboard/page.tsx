import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentTeam } from "@/lib/team";

export default async function DashboardPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader
        title={team.name}
        actions={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden">
              <LogOut />
            </Button>
          </form>
        }
      />
      <nav className="flex flex-1 flex-col items-center justify-center gap-3">
        <Link href="/roster" className="underline">
          Kader
        </Link>
        <Link href="/seasons" className="underline">
          Saisons
        </Link>
        <Link href="/games" className="underline">
          Spiele
        </Link>
      </nav>
    </main>
  );
}
