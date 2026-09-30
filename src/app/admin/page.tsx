import { eq } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin";
import { EditCoachForm } from "./edit-coach-form";
import { ResetPasswordForm } from "./reset-password-form";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const coaches = await db
    .select({ id: users.id, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, "COACH"));

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader
        title="Admin"
        actions={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden">
              <LogOut />
            </Button>
          </form>
        }
      />
      <div className="w-full max-w-3xl px-4 py-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-Mail</TableHead>
              <TableHead>Erstellt am</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell>{coach.email}</TableCell>
                <TableCell>{coach.createdAt.toLocaleDateString("de-DE")}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <EditCoachForm userId={coach.id} email={coach.email} />
                    <ResetPasswordForm userId={coach.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {coaches.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">Keine Coach-Konten vorhanden.</p>
        )}
      </div>
    </main>
  );
}
