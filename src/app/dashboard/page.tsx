import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getCurrentTeam } from "@/lib/team";

export default async function DashboardPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
      <nav className="flex flex-col gap-3">
        <Link href="/roster" className="underline">
          Kader
        </Link>
        <Link href="/seasons" className="underline">
          Saisons
        </Link>
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="rounded border px-4 py-2">
          Abmelden
        </button>
      </form>
    </main>
  );
}
