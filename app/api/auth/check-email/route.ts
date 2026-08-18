import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: cleanEmail });

    return NextResponse.json({ exists: Boolean(user) });
  } catch (error) {
    console.error("Error checking email existence:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check email" },
      { status: 500 }
    );
  }
}
