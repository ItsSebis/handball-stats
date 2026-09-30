import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentTeam } from "@/lib/team";
import { getCurrentUser } from "@/lib/user";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";

export default async function SettingsPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader title="Einstellungen" backHref="/dashboard" />

      <div className="flex w-full flex-col items-center gap-6 px-4 py-8">
        <EmailForm email={user.email} />
        <PasswordForm />
      </div>
    </main>
  );
}
