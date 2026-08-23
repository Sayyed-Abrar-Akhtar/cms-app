import { requireSuperadmin } from "@/lib/auth";
import { NewOrganizationClient } from "./_components/NewOrganizationClient";

export default async function NewOrganizationPage() {
  await requireSuperadmin();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <NewOrganizationClient />
      </div>
    </div>
  );
}
