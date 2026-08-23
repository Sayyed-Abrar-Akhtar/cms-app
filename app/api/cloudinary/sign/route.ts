import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { getCloudinarySignature } from "@/lib/cloudinary";

export async function POST() {
  try {
    await requireEditor();
    const signatureData = getCloudinarySignature();
    return NextResponse.json(signatureData);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: number }).status === 403
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Cloudinary sign error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign upload request" },
      { status: 500 }
    );
  }
}
