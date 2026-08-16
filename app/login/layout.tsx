import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to the Headless CMS Admin Layer.",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
