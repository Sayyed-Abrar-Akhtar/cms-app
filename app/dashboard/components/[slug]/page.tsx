import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentType } from "@/models/ComponentType";
import { ComponentInstance } from "@/models/ComponentInstance";
import { notFound } from "next/navigation";
import { ComponentTypeForm } from "../_components/ComponentTypeForm";

export const revalidate = 0;

export default async function EditComponentTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireSuperadmin();
  await connectDB();

  const { slug } = await params;

  const componentTypeDoc = await ComponentType.findOne({ slug }).lean();

  if (!componentTypeDoc) {
    notFound();
  }

  // Check if instances exist for this component type
  const instanceExists = await ComponentInstance.exists({
    componentType: componentTypeDoc._id,
  });

  const serializedData = {
    _id: componentTypeDoc._id.toString(),
    name: componentTypeDoc.name,
    slug: componentTypeDoc.slug,
    description: componentTypeDoc.description,
    isRepeatable: componentTypeDoc.isRepeatable,
    fields: componentTypeDoc.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      order: f.order,
      helpText: f.helpText,
      config: f.config,
    })),
  };

  return (
    <ComponentTypeForm
      initialData={serializedData}
      hasInstancesWarning={Boolean(instanceExists)}
    />
  );
}
