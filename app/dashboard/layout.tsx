import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage content schemas, organization settings, and component instances.",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
