import { Schema, model, models, type Document, type Model } from "mongoose";
import crypto from "crypto";

export type SiteType = "COMPANY" | "INDIVIDUAL";

export interface OrganizationDoc extends Document {
  name: string;
  slug: string;
  type: SiteType;
  // Read-only key the client's separate public-facing Next.js site uses to
  // fetch its own content from /api/public/[orgSlug]/[page]. Never exposes
  // write access.
  publicApiKey: string;
  ownerEmail: string;
  createdAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDoc>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ["COMPANY", "INDIVIDUAL"], required: true },
  publicApiKey: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(24).toString("hex"),
  },
  ownerEmail: { type: String, required: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export const Organization: Model<OrganizationDoc> =
  models.Organization || model<OrganizationDoc>("Organization", OrganizationSchema);
