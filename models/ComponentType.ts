import { Schema, model, models, type Document, type Model } from "mongoose";
import { FIELD_TYPES, type FieldDefinition } from "@/lib/field-types";

export interface ComponentTypeDoc extends Document {
  name: string; // "Banner", "Split Image + Text", "Project Card"
  slug: string;
  description?: string;
  /**
   * Fixed components: superadmin controls how many instances exist and
   * where — editors can only fill in values.
   * Repeatable components (isRepeatable: true): editors can add/remove
   * instances of this type themselves (e.g. "add another project"), but the
   * fields themselves are still locked to what's defined here.
   */
  isRepeatable: boolean;
  fields: FieldDefinition[];
  createdAt: Date;
}

const FieldDefinitionSchema = new Schema<FieldDefinition>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: FIELD_TYPES, required: true },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    helpText: { type: String },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ComponentTypeSchema = new Schema<ComponentTypeDoc>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  isRepeatable: { type: Boolean, default: false },
  fields: { type: [FieldDefinitionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const ComponentType: Model<ComponentTypeDoc> =
  models.ComponentType || model<ComponentTypeDoc>("ComponentType", ComponentTypeSchema);
