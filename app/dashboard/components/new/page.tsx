import { requireSuperadmin } from "@/lib/auth";
import { ComponentTypeForm } from "../_components/ComponentTypeForm";

export default async function NewComponentTypePage() {
  await requireSuperadmin();

  return <ComponentTypeForm />;
}
