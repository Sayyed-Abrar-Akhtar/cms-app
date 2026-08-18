"use client";

/**
 * Browser-side Cloudinary upload via the signed flow:
 *   1. POST /api/cloudinary/sign → short-lived signature (secret stays server-side)
 *   2. POST the file straight to Cloudinary with that signature
 * Returns the secure_url (always on res.cloudinary.com).
 */

export type UploadSignatureResponse = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
};

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
  if (!signRes.ok) {
    const body = (await signRes.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Upload signature failed — sign in again and retry.");
  }
  const sig = (await signRes.json()) as UploadSignatureResponse;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!uploadRes.ok) {
    throw new Error("Cloudinary rejected the upload — check the file and try again.");
  }

  const data = (await uploadRes.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL — try again.");
  }
  return data.secure_url;
}
