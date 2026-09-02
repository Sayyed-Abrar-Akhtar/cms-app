import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import {
  UsersListClient,
  type SerializedUser,
} from "./_components/UsersListClient";

export default async function UsersDirectoryPage() {
  await requireSuperadmin();
  await connectDB();

  // Ensure Organization model is registered for populate
  if (!Organization) {
    // referenced to ensure model registration
  }

  const users = await User.find()
    .populate({ path: "organizations", select: "name slug" })
    .sort({ createdAt: -1 })
    .lean();

  const serializedUsers: SerializedUser[] = users.map((u: any) => {
    const orgs = (u.organizations || [])
      .filter((org: any) => org && typeof org === "object")
      .map((org: any) => ({
        id: org._id ? org._id.toString() : String(org),
        name: org.name || "Unknown Organization",
        slug: org.slug || "",
      }));

    return {
      id: u._id.toString(),
      name: u.name ?? null,
      email: u.email,
      role: u.role,
      organizations: orgs,
      updateQuota: typeof u.updateQuota === "number" ? u.updateQuota : 30,
      updatesUsedInPeriod: typeof u.updatesUsedInPeriod === "number" ? u.updatesUsedInPeriod : 0,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <UsersListClient users={serializedUsers} />
      </div>
    </div>
  );
}
