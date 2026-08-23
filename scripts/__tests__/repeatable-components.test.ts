import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Dynamic current user variable for mocking auth
let currentUser = {
  _id: new mongoose.Types.ObjectId().toString(),
  email: "editor@test.com",
  role: "EDITOR" as const,
  organizations: [] as mongoose.Types.ObjectId[],
  updateQuota: 30,
  updatesUsedInPeriod: 0,
  quotaPeriodStart: new Date(),
  save: async () => {},
};

vi.mock("@/lib/auth", () => ({
  requireEditor: async () => currentUser,
  requireSuperadmin: async () => ({ role: "SUPERADMIN", email: "admin@test.com" }),
  getCurrentUser: async () => currentUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  cacheLife: () => {},
  cacheTag: () => {},
}));

describe("Repeatable Component Editing Actions", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let User: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ComponentType: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ComponentInstance: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addRepeatableInstanceAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let removeRepeatableInstanceAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reorderRepeatableInstancesAction: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const userMod = await import("../../models/User");
    const orgMod = await import("../../models/Organization");
    const typeMod = await import("../../models/ComponentType");
    const instMod = await import("../../models/ComponentInstance");
    const actionsMod = await import("../../app/dashboard/actions");

    User = userMod.User;
    Organization = orgMod.Organization;
    ComponentType = typeMod.ComponentType;
    ComponentInstance = instMod.ComponentInstance;
    addRepeatableInstanceAction = actionsMod.addRepeatableInstanceAction;
    removeRepeatableInstanceAction = actionsMod.removeRepeatableInstanceAction;
    reorderRepeatableInstancesAction = actionsMod.reorderRepeatableInstancesAction;
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

  it("allows an editor to add an instance of a repeatable component type for their org", async () => {
    const org = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      type: "COMPANY",
      ownerEmail: "owner@alpha.com",
    });

    const repeatableType = await ComponentType.create({
      name: "Project Card",
      slug: "project-card",
      isRepeatable: true,
      fields: [{ key: "title", label: "Title", type: "TEXT", required: true, order: 0 }],
    });

    const userDoc = await User.create({
      email: "editor@alpha.com",
      role: "EDITOR",
      organizations: [org._id],
    });

    currentUser = {
      _id: userDoc._id.toString(),
      email: userDoc.email,
      role: "EDITOR",
      organizations: [org._id],
      updateQuota: 30,
      updatesUsedInPeriod: 0,
      quotaPeriodStart: new Date(),
      save: async () => {},
    };

    const result = await addRepeatableInstanceAction("org-alpha", "home", repeatableType._id.toString());
    expect(result.success).toBe(true);

    const createdInstances = await ComponentInstance.find({ organization: org._id, page: "home" });
    expect(createdInstances).toHaveLength(1);
    expect(createdInstances[0].componentType.toString()).toBe(repeatableType._id.toString());
  });

  it("prevents an editor from adding an instance of a non-repeatable component type", async () => {
    const org = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      type: "COMPANY",
      ownerEmail: "owner@alpha.com",
    });

    const nonRepeatableType = await ComponentType.create({
      name: "Banner",
      slug: "banner",
      isRepeatable: false,
      fields: [{ key: "headline", label: "Headline", type: "TEXT", required: true, order: 0 }],
    });

    const userDoc = await User.create({
      email: "editor@alpha.com",
      role: "EDITOR",
      organizations: [org._id],
    });

    currentUser = {
      _id: userDoc._id.toString(),
      email: userDoc.email,
      role: "EDITOR",
      organizations: [org._id],
      updateQuota: 30,
      updatesUsedInPeriod: 0,
      quotaPeriodStart: new Date(),
      save: async () => {},
    };

    const result = await addRepeatableInstanceAction("org-alpha", "home", nonRepeatableType._id.toString());
    expect(result.success).toBe(false);
    expect(result.error).toContain("Only repeatable components can be added by editors.");

    const instances = await ComponentInstance.find({ organization: org._id });
    expect(instances).toHaveLength(0);
  });

  it("blocks an editor from modifying another organization's repeatable components", async () => {
    const orgA = await Organization.create({
      name: "Org A",
      slug: "org-a",
      type: "COMPANY",
      ownerEmail: "owner@a.com",
    });

    const orgB = await Organization.create({
      name: "Org B",
      slug: "org-b",
      type: "COMPANY",
      ownerEmail: "owner@b.com",
    });

    const repeatableType = await ComponentType.create({
      name: "Experience Item",
      slug: "experience-item",
      isRepeatable: true,
      fields: [{ key: "role", label: "Role", type: "TEXT", required: true, order: 0 }],
    });

    const instB = await ComponentInstance.create({
      organization: orgB._id,
      componentType: repeatableType._id,
      page: "home",
      order: 0,
      values: [{ key: "role", value: "Developer" }],
    });

    // Editor belongs ONLY to Org A
    const userDoc = await User.create({
      email: "editor@orga.com",
      role: "EDITOR",
      organizations: [orgA._id],
    });

    currentUser = {
      _id: userDoc._id.toString(),
      email: userDoc.email,
      role: "EDITOR",
      organizations: [orgA._id],
      updateQuota: 30,
      updatesUsedInPeriod: 0,
      quotaPeriodStart: new Date(),
      save: async () => {},
    };

    // 1. Attempt add to Org B
    const addRes = await addRepeatableInstanceAction("org-b", "home", repeatableType._id.toString());
    expect(addRes.success).toBe(false);
    expect(addRes.error).toContain("Unauthorized for this organization.");

    // 2. Attempt remove instance from Org B
    const removeRes = await removeRepeatableInstanceAction(instB._id.toString());
    expect(removeRes.success).toBe(false);
    expect(removeRes.error).toContain("Unauthorized for this organization.");

    // Verify instB still exists
    const checkInst = await ComponentInstance.findById(instB._id);
    expect(checkInst).not.toBeNull();
  });

  it("allows removing and reordering repeatable instances for an authorized editor", async () => {
    const org = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      type: "COMPANY",
      ownerEmail: "owner@alpha.com",
    });

    const repeatableType = await ComponentType.create({
      name: "Project Card",
      slug: "project-card",
      isRepeatable: true,
      fields: [{ key: "title", label: "Title", type: "TEXT", required: true, order: 0 }],
    });

    const inst1 = await ComponentInstance.create({
      organization: org._id,
      componentType: repeatableType._id,
      page: "home",
      order: 0,
      values: [{ key: "title", value: "Project 1" }],
    });

    const inst2 = await ComponentInstance.create({
      organization: org._id,
      componentType: repeatableType._id,
      page: "home",
      order: 1,
      values: [{ key: "title", value: "Project 2" }],
    });

    const userDoc = await User.create({
      email: "editor@alpha.com",
      role: "EDITOR",
      organizations: [org._id],
    });

    currentUser = {
      _id: userDoc._id.toString(),
      email: userDoc.email,
      role: "EDITOR",
      organizations: [org._id],
      updateQuota: 30,
      updatesUsedInPeriod: 0,
      quotaPeriodStart: new Date(),
      save: async () => {},
    };

    // Reorder inst2 before inst1
    const reorderRes = await reorderRepeatableInstancesAction("org-alpha", "home", [
      inst2._id.toString(),
      inst1._id.toString(),
    ]);
    expect(reorderRes.success).toBe(true);

    const updated1 = await ComponentInstance.findById(inst1._id);
    const updated2 = await ComponentInstance.findById(inst2._id);
    expect(updated2?.order).toBe(0);
    expect(updated1?.order).toBe(1);

    // Remove inst1
    const removeRes = await removeRepeatableInstanceAction(inst1._id.toString());
    expect(removeRes.success).toBe(true);

    const check1 = await ComponentInstance.findById(inst1._id);
    expect(check1).toBeNull();
  });
});
