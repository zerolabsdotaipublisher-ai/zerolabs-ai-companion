import { AppHeader } from "@/components/auth/app-header";
import { getAuthenticatedUser } from "@/lib/auth/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();
  const isAuthenticated = user !== null;

  return (
    <>
      <AppHeader isAuthenticated={isAuthenticated} userEmail={user?.email ?? null} />
      {children}
    </>
  );
}
