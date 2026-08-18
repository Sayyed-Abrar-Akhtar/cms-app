import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../../models/User";
import { Organization } from "../../models/Organization";
import { ComponentType } from "../../models/ComponentType";
import { ComponentInstance } from "../../models/ComponentInstance";
import { validateFieldValue } from "../../lib/validate-field";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await ComponentType.deleteMany({});
  await ComponentInstance.deleteMany({});
});

describe("Multi-Organization Editor & Field Validation Tests", () => {
  it("validates TEXT, STRING_URL, BOOLEAN, NUMBER, SELECT, LINK, DATE field values correctly", () => {
    // TEXT
    const textField = { key: "title", label: "Title", type: "TEXT" as const, required: true, order: 0 };
    expect(validateFieldValue(textField, "Hello World")).toEqual({ ok: true, value: "Hello World" });
    expect(validateFieldValue(textField, "")).toEqual({ ok: false, error: "Title is required." });

    // STRING_URL
    const urlField = { key: "website", label: "Website", type: "STRING_URL" as const, required: false, order: 1 };
    expect(validateFieldValue(urlField, "https://example.com")).toEqual({ ok: true, value: "https://example.com/" });
    expect(validateFieldValue(urlField, "invalid-url")).toEqual({ ok: false, error: "Website must be a valid URL starting with https:// or http://." });

    // BOOLEAN
    const boolField = { key: "active", label: "Active", type: "BOOLEAN" as const, required: false, order: 2 };
    expect(validateFieldValue(boolField, true)).toEqual({ ok: true, value: true });
    expect(validateFieldValue(boolField, false)).toEqual({ ok: true, value: false });

    // NUMBER
    const numField = { key: "age", label: "Age", type: "NUMBER" as const, required: true, order: 3 };
    expect(validateFieldValue(numField, 25)).toEqual({ ok: true, value: 25 });
    expect(validateFieldValue(numField, "abc")).toEqual({ ok: false, error: "Age must be a number." });

    // SELECT
    const selectField = {
      key: "theme",
      label: "Theme",
      type: "SELECT" as const,
      required: true,
      order: 4,
      config: { options: ["dark", "light"] },
    };
    expect(validateFieldValue(selectField, "dark")).toEqual({ ok: true, value: "dark" });
    expect(validateFieldValue(selectField, "blue")).toEqual({ ok: false, error: "Theme must be one of: dark, light." });

    // LINK
    const linkField = { key: "cta", label: "CTA Link", type: "LINK" as const, required: true, order: 5 };
    expect(validateFieldValue(linkField, { label: "Click Here", href: "https://google.com" })).toEqual({
      ok: true,
      value: { label: "Click Here", href: "https://google.com/" },
    });
    expect(validateFieldValue(linkField, { label: "Click", href: "not-a-url" })).toEqual({
      ok: false,
      error: "CTA Link must have a valid URL starting with https:// or http://.",
    });

    // DATE
    const dateField = { key: "publishDate", label: "Publish Date", type: "DATE" as const, required: true, order: 6 };
    expect(validateFieldValue(dateField, "2026-08-18")).toEqual({ ok: true, value: "2026-08-18" });
    expect(validateFieldValue(dateField, "18-08-2026")).toEqual({ ok: false, error: "Publish Date must be a date (YYYY-MM-DD)." });
  });

  it("verifies multi-org ownership membership logic on database query", async () => {
    const org1 = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      type: "COMPANY",
      ownerEmail: "owner1@alpha.com",
    });

    const org2 = await Organization.create({
      name: "Org Beta",
      slug: "org-beta",
      type: "INDIVIDUAL",
      ownerEmail: "owner2@beta.com",
    });

    const editor = await User.create({
      email: "multi@editor.com",
      role: "EDITOR",
      organizations: [org1._id],
    });

    // Editor is member of org1, but not org2
    const isMemberOrg1 = editor.organizations.some((id) => id.toString() === org1._id.toString());
    const isMemberOrg2 = editor.organizations.some((id) => id.toString() === org2._id.toString());

    expect(isMemberOrg1).toBe(true);
    expect(isMemberOrg2).toBe(false);

    // Update editor to have both orgs
    editor.organizations.push(org2._id);
    await editor.save();

    const updatedEditor = await User.findById(editor._id);
    expect(updatedEditor?.organizations).toHaveLength(2);
    expect(updatedEditor?.organizations.some((id) => id.toString() === org2._id.toString())).toBe(true);
  });
});
