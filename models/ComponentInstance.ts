import { Schema, model, models, type Document, type Model, Types } from "mongoose";

export interface FieldValueEntry {
  key: string; // matches FieldDefinition.key on the parent ComponentType
  value: unknown; // shape depends on the field type (string, boolean, Tiptap JSON, etc.)
}

export interface ComponentInstanceDoc extends Document {
  organization: Types.ObjectId;
  componentType: Types.ObjectId;
  page: string; // "home", "about", ...
  order: number;
  values: FieldValueEntry[];
  updatedAt: Date;
  updatedBy?: string | null; // email of last editor, for a simple audit trail
}

const FieldValueSchema = new Schema<FieldValueEntry>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const ComponentInstanceSchema = new Schema<ComponentInstanceDoc>({
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  componentType: { type: Schema.Types.ObjectId, ref: "ComponentType", required: true },
  page: { type: String, default: "home", index: true },
  order: { type: Number, default: 0 },
  values: { type: [FieldValueSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null },
});

// Instances are almost always fetched "give me everything on this org's page"
ComponentInstanceSchema.index({ organization: 1, page: 1, order: 1 });

export const ComponentInstance: Model<ComponentInstanceDoc> =
  models.ComponentInstance ||
  model<ComponentInstanceDoc>("ComponentInstance", ComponentInstanceSchema);
