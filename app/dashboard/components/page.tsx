import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentType } from "@/models/ComponentType";
import { ComponentTypesListClient, type SerializedComponentType } from "./_components/ComponentTypesListClient";

export default async function ComponentTypesListPage() {
  await requireSuperadmin();
  await connectDB();

  const componentTypes = await ComponentType.find().sort({ createdAt: -1 }).lean();

  const serializedComponentTypes: SerializedComponentType[] = componentTypes.map((ct) => ({
    id: ct._id.toString(),
    name: ct.name,
    slug: ct.slug,
    description: ct.description ?? undefined,
    isRepeatable: Boolean(ct.isRepeatable),
    fieldsCount: ct.fields?.length || 0,
  }));

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <ComponentTypesListClient componentTypes={serializedComponentTypes} />
      </div>
    </div>
  );
}
