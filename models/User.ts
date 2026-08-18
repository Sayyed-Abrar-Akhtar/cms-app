import { Schema, model, models, type Document, type Model, Types } from "mongoose";

export type Role = "SUPERADMIN" | "EDITOR";

export interface UserDoc extends Document {
  email: string;
  role: Role;
  organizations: Types.ObjectId[];
  magicIssuer?: string | null; // Magic's stable per-user DID, set on first login
  updateQuota: number;
  updatesUsedInPeriod: number;
  quotaPeriodStart: Date;
  createdAt: Date;
}

const UserSchema = new Schema<UserDoc>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ["SUPERADMIN", "EDITOR"], default: "EDITOR" },
  organizations: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
  magicIssuer: { type: String, unique: true, sparse: true, default: null },
  updateQuota: { type: Number, default: 30 },
  updatesUsedInPeriod: { type: Number, default: 0 },
  quotaPeriodStart: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const User: Model<UserDoc> = models.User || model<UserDoc>("User", UserSchema);
