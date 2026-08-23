import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import {
  OrganizationsListClient,
  type SerializedOrganization,
} from "./_components/OrganizationsListClient";

export default async function OrganizationsListPage() {
  await requireSuperadmin();
  await connectDB();

  const organizations = await Organization.find().sort({ createdAt: -1 }).lean();

  const orgIds = organizations.map((o) => o._id);
  const editors = await User.find({
    organizations: { $in: orgIds },
    role: "EDITOR",
  }).lean();

  const editorCountMap: Record<string, number> = {};
  editors.forEach((editor) => {
    if (editor.organizations && Array.isArray(editor.organizations)) {
      editor.organizations.forEach((orgId) => {
        const key = orgId.toString();
        editorCountMap[key] = (editorCountMap[key] || 0) + 1;
      });
    }
  });

  const serializedOrganizations: SerializedOrganization[] = organizations.map(
    (org) => {
      const orgIdStr = org._id.toString();
      return {
        id: orgIdStr,
        name: org.name,
        slug: org.slug,
        type: org.type,
        ownerEmail: org.ownerEmail,
        editorCount: editorCountMap[orgIdStr] || 0,
      };
    }
  );

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <OrganizationsListClient organizations={serializedOrganizations} />
      </div>
    </div>
  );
}
