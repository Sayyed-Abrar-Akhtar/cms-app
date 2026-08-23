import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentType } from "@/models/ComponentType";
import { ComponentsListClient, type ComponentTypeSummary } from "./_components/ComponentsListClient";

export default async function ComponentTypesListPage() {
  await requireSuperadmin();
  await connectDB();

  const componentTypesDocs = await ComponentType.find().sort({ createdAt: -1 }).lean();

  const serializedComponentTypes: ComponentTypeSummary[] = componentTypesDocs.map((ct) => ({
    id: ct._id.toString(),
    name: ct.name,
    slug: ct.slug,
    description: ct.description || undefined,
    isRepeatable: Boolean(ct.isRepeatable),
    fieldsCount: ct.fields?.length || 0,
  }));

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <ComponentsListClient componentTypes={serializedComponentTypes} />
      </div>
    </div>
  );
}
