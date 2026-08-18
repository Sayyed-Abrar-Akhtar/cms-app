import { v2 as cloudinary } from "cloudinary";

/**
 * Server-side Cloudinary config for signed uploads.
 * The browser uploads directly to Cloudinary using a short-lived signature
 * minted here — CLOUDINARY_API_SECRET must never reach the client
 * (AGENTS.md §2).
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

export type UploadSignature = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
};

/**
 * Sign a set of upload parameters. Valid for one hour (Cloudinary rejects
 * timestamps older than that), which is more than enough for an editor
 * clicking "Upload".
 */
export function createUploadSignature(folder = "cms-uploads"): UploadSignature {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret as string
  );

  return {
    timestamp,
    signature,
    apiKey: apiKey as string,
    cloudName: cloudName as string,
    folder,
  };
}
