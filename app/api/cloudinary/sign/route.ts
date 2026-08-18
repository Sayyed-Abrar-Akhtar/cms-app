import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { createUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";

/**
 * POST /api/cloudinary/sign
 *
 * Mints a short-lived upload signature so the browser can upload images
 * directly to Cloudinary. Any authenticated user (editor or superadmin)
 * may sign — signatures only permit *uploads into our Cloudinary account*,
 * never reads or deletes, and the resulting URL is re-validated
 * server-side on every save (see lib/validate-field.ts).
 */
export async function POST() {
  const session = await getSessionPayload();

  if (!session) {
    return NextResponse.json(
      { error: "Sign in before uploading images." },
      { status: 401 }
    );
  }

  if (session.role !== "EDITOR" && session.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Your role cannot upload images." },
      { status: 403 }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image uploads are not configured on this server — ask the admin to set the Cloudinary environment variables.",
      },
      { status: 503 }
    );
  }

  const signature = createUploadSignature(
    process.env.CLOUDINARY_UPLOAD_FOLDER || "cms-uploads"
  );

  return NextResponse.json(signature);
}
