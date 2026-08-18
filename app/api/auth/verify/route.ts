import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Magic } from "@magic-sdk/admin";
import { connectDB } from "@/lib/mongodb";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { User } from "@/models/User";

const magicSecretKey = process.env.MAGIC_SECRET_KEY;
if (!magicSecretKey) {
  console.warn("MAGIC_SECRET_KEY is not defined in environment variables.");
}
const magic = new Magic(magicSecretKey || "dummy_secret_key_for_build");

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    let didToken: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      didToken = authHeader.substring(7);
    } else {
      const body = await request.json().catch(() => ({}));
      didToken = body.didToken || null;
    }

    if (!didToken) {
      return NextResponse.json({ error: "Missing DID token" }, { status: 400 });
    }

    // Validate DID token with @magic-sdk/admin
    magic.token.validate(didToken);

    // Retrieve metadata
    const metadata = await magic.users.getMetadataByToken(didToken);
    const email = metadata.email;
    const issuer = metadata.issuer;

    if (!email || !issuer) {
      return NextResponse.json({ error: "Invalid user metadata from Magic" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    await connectDB();

    let user = await User.findOne({
      $or: [{ magicIssuer: issuer }, { email: cleanEmail }],
    });

    if (!user) {
      // Create new user with EDITOR role and no organization
      user = await User.create({
        email: cleanEmail,
        role: "EDITOR",
        organizations: [],
        magicIssuer: issuer,
      });
    } else {
      let updated = false;
      if (!user.magicIssuer) {
        user.magicIssuer = issuer;
        updated = true;
      }
      if (user.email !== cleanEmail) {
        user.email = cleanEmail;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const sessionPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizations && user.organizations.length > 0 ? user.organizations[0].toString() : null,
    };

    const sessionToken = await createSessionToken(sessionPayload);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);

    return NextResponse.json({ success: true, redirectUrl: "/dashboard" });
  } catch (error) {
    console.error("Error verifying DID token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 }
    );
  }
}
