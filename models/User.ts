import { Schema, model, models, type Document, type Model, Types } from "mongoose";

export type Role = "SUPERADMIN" | "EDITOR";

export interface UserDoc extends Document {
  email: string;
  role: Role;
  organization?: Types.ObjectId | null; // null for SUPERADMIN
  magicIssuer?: string | null; // Magic's stable per-user DID, set on first login
  createdAt: Date;
}

const UserSchema = new Schema<UserDoc>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ["SUPERADMIN", "EDITOR"], default: "EDITOR" },
  organization: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
  magicIssuer: { type: String, unique: true, sparse: true, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const User: Model<UserDoc> = models.User || model<UserDoc>("User", UserSchema);
