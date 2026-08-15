import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from "@/lib/session";
import { User, type UserDoc } from "@/models/User";

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<UserDoc | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;

  await connectDB();
  const user = await User.findById(payload.userId);
  return user;
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireSuperadmin(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "SUPERADMIN") {
    throw new ForbiddenError("Forbidden: Superadmin role required");
  }
  return user;
}

export async function requireEditor(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "EDITOR" && user.role !== "SUPERADMIN") {
    throw new ForbiddenError("Forbidden: Editor role required");
  }
  return user;
}
