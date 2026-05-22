import "server-only";

import { redirect } from "next/navigation";

import {
  buildServerAuthRedirectPath,
  getServerAuthState,
  hasAuthenticatedServerSession,
  type AuthenticatedServerAuthState,
  type ProtectedRouteOptions,
} from "@/lib/auth/server-session";

export { getAuthenticatedUser, getServerSession } from "@/lib/auth/server-session";

export async function requireServerSession(
  options: ProtectedRouteOptions,
): Promise<AuthenticatedServerAuthState> {
  const authState = await getServerAuthState();

  if (!hasAuthenticatedServerSession(authState)) {
    redirect(buildServerAuthRedirectPath(options));
  }

  return authState;
}

export async function requireServerUser(options: ProtectedRouteOptions) {
  const authState = await requireServerSession(options);
  return authState.user;
}
