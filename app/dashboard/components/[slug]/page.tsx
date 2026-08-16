import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentType } from "@/models/ComponentType";
import { ComponentInstance } from "@/models/ComponentInstance";
import { notFound } from "next/navigation";
import { ComponentTypeForm } from "../_components/ComponentTypeForm";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const ct = await ComponentType.findOne({ slug }).select("name").lean();
  return {
    title: ct ? `Edit: ${ct.name}` : "Edit Component Type",
    description: `Edit component type field configuration for ${slug}`,
  };
}

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
