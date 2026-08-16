import { requireSuperadmin } from "@/lib/auth";
import { ComponentTypeForm } from "../_components/ComponentTypeForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Component Type",
  description: "Create a new component type blueprint with field definitions",
};

export default async function NewComponentTypePage() {
  await requireSuperadmin();

  return <ComponentTypeForm />;
}
