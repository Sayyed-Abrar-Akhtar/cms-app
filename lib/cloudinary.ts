import { v2 as cloudinary } from "cloudinary";

export type UploadSignatureResponse = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
};

/**
 * Generate a Cloudinary upload signature server-side.
 * The secret (CLOUDINARY_API_SECRET) is kept server-side only and never sent to the client.
 */
export function getCloudinarySignature(folder = "cms"): UploadSignatureResponse {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary configuration is missing on server.");
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    apiSecret
  );

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
  };
}
