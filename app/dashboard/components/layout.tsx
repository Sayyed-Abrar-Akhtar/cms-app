import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Component Types",
  description: "Define and edit component type schemas and content fields.",
};

export default function ComponentTypesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
