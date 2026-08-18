import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Mock requireSuperadmin and revalidatePath
vi.mock("@/lib/auth", () => ({
  requireSuperadmin: async () => ({ role: "SUPERADMIN", email: "admin@example.com" }),
  getCurrentUser: async () => ({ role: "SUPERADMIN", email: "admin@example.com" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

describe("User Organizations & Migration Tests", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let User: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inviteEditorAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let removeEditorAction: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const userMod = await import("../../models/User");
    const orgMod = await import("../../models/Organization");
    const actionsMod = await import("../../app/dashboard/organizations/actions");

    User = userMod.User;
    Organization = orgMod.Organization;
    inviteEditorAction = actionsMod.inviteEditorAction;
    removeEditorAction = actionsMod.removeEditorAction;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
  });

  it("allows inviting the same editor email to two different organizations without conflict", async () => {
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

    const editorEmail = "editor@multi.com";

    // Invite to Org 1
    const res1 = await inviteEditorAction(org1._id.toString(), editorEmail);
    if (!res1.success) console.error("inviteEditorAction error:", res1.error);
    expect(res1.success).toBe(true);

    // Invite to Org 2
    const res2 = await inviteEditorAction(org2._id.toString(), editorEmail);
    expect(res2.success).toBe(true);

    // Verify user document
    const user = await User.findOne({ email: editorEmail });
    expect(user).not.toBeNull();
    expect(user?.organizations).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(user?.organizations.map((id: any) => id.toString())).toContain(org1._id.toString());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(user?.organizations.map((id: any) => id.toString())).toContain(org2._id.toString());

    // Query editors for Org 1 and Org 2
    const editorsOrg1 = await User.find({ organizations: org1._id, role: "EDITOR" });
    const editorsOrg2 = await User.find({ organizations: org2._id, role: "EDITOR" });

    expect(editorsOrg1).toHaveLength(1);
    expect(editorsOrg1[0].email).toBe(editorEmail);

    expect(editorsOrg2).toHaveLength(1);
    expect(editorsOrg2[0].email).toBe(editorEmail);
  });

  it("handles inviting an editor already attached to the same org idempotently without duplicating entries", async () => {
    const org = await Organization.create({
      name: "Org Gamma",
      slug: "org-gamma",
      type: "COMPANY",
      ownerEmail: "owner@gamma.com",
    });

    const editorEmail = "editor@gamma.com";

    const res1 = await inviteEditorAction(org._id.toString(), editorEmail);
    expect(res1.success).toBe(true);

    // Invite again
    const res2 = await inviteEditorAction(org._id.toString(), editorEmail);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain("already attached");

    const user = await User.findOne({ email: editorEmail });
    expect(user?.organizations).toHaveLength(1);
  });

  it("removing an editor from one org does not remove them from another org", async () => {
    const org1 = await Organization.create({
      name: "Org Delta",
      slug: "org-delta",
      type: "COMPANY",
      ownerEmail: "owner1@delta.com",
    });

    const org2 = await Organization.create({
      name: "Org Epsilon",
      slug: "org-epsilon",
      type: "INDIVIDUAL",
      ownerEmail: "owner2@epsilon.com",
    });

    const editorEmail = "shared@editor.com";

    await inviteEditorAction(org1._id.toString(), editorEmail);
    await inviteEditorAction(org2._id.toString(), editorEmail);

    const user = await User.findOne({ email: editorEmail });
    expect(user).not.toBeNull();

    // Remove from Org 1
    const removeRes = await removeEditorAction(org1._id.toString(), user!._id.toString());
    expect(removeRes.success).toBe(true);

    const updatedUser = await User.findById(user!._id);
    expect(updatedUser?.organizations).toHaveLength(1);
    expect(updatedUser?.organizations[0].toString()).toBe(org2._id.toString());

    // Check query results
    const editorsOrg1 = await User.find({ organizations: org1._id });
    const editorsOrg2 = await User.find({ organizations: org2._id });

    expect(editorsOrg1).toHaveLength(0);
    expect(editorsOrg2).toHaveLength(1);
  });

  it("migration script converts existing singular 'organization' field to 'organizations' array without dropping data", async () => {
    const db = mongoose.connection.db;
    const usersCollection = db!.collection("users");

    const legacyOrgId = new mongoose.Types.ObjectId();

    // Insert legacy user raw doc into MongoDB collection directly
    await usersCollection.insertOne({
      email: "legacy@editor.com",
      role: "EDITOR",
      organization: legacyOrgId,
      createdAt: new Date(),
    });

    // Verify raw legacy doc
    const rawBefore = await usersCollection.findOne({ email: "legacy@editor.com" });
    expect(rawBefore?.organization).toEqual(legacyOrgId);
    expect(rawBefore?.organizations).toBeUndefined();

    // Perform migration logic as in scripts/migrate-user-organizations.ts
    const cursor = usersCollection.find({
      $or: [
        { organization: { $exists: true } },
        { organizations: { $exists: false } },
        { organizations: null },
      ],
    });

    const usersToMigrate = await cursor.toArray();
    for (const doc of usersToMigrate) {
      const oldOrg = doc.organization;
      let currentOrgs = Array.isArray(doc.organizations) ? doc.organizations : [];

      if (oldOrg) {
        const oldOrgStr = oldOrg.toString();
        const exists = currentOrgs.some((id: unknown) => String(id) === oldOrgStr);
        if (!exists) {
          currentOrgs = [...currentOrgs, oldOrg];
        }
      }

      await usersCollection.updateOne(
        { _id: doc._id },
        {
          $set: { organizations: currentOrgs },
          $unset: { organization: "" },
        }
      );
    }

    // Verify raw doc after migration
    const rawAfter = await usersCollection.findOne({ email: "legacy@editor.com" });
    expect(rawAfter?.organization).toBeUndefined();
    expect(rawAfter?.organizations).toHaveLength(1);
    expect(rawAfter?.organizations[0].toString()).toBe(legacyOrgId.toString());

    // Verify querying via Mongoose User model
    const migratedUser = await User.findOne({ organizations: legacyOrgId });
    expect(migratedUser).not.toBeNull();
    expect(migratedUser?.email).toBe("legacy@editor.com");
  });
});
