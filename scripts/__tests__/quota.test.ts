import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

describe("Editor Monthly Update Quota Tests", () => {
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
  let saveInstanceValuesAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resetEditorQuotaAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authModule: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const userMod = await import("../../models/User");
    const orgMod = await import("../../models/Organization");
    const ctMod = await import("../../models/ComponentType");
    const ciMod = await import("../../models/ComponentInstance");
    const dashActionsMod = await import("../../app/dashboard/actions");
    const orgActionsMod = await import("../../app/dashboard/organizations/actions");
    authModule = await import("../../lib/auth");

    User = userMod.User;
    Organization = orgMod.Organization;
    ComponentType = ctMod.ComponentType;
    ComponentInstance = ciMod.ComponentInstance;
    saveInstanceValuesAction = dashActionsMod.saveInstanceValuesAction;
    resetEditorQuotaAction = orgActionsMod.resetEditorQuotaAction;
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
    vi.restoreAllMocks();
  });

  it("allows 30 saves, rejects the 31st save with actionable error, and preserves DB state", async () => {
    const org = await Organization.create({
      name: "Quota Org",
      slug: "quota-org",
      type: "COMPANY",
      ownerEmail: "owner@quota.com",
    });

    const editor = await User.create({
      email: "editor1@quota.com",
      role: "EDITOR",
      organizations: [org._id],
      updateQuota: 30,
      updatesUsedInPeriod: 0,
      quotaPeriodStart: new Date(),
    });

    const ct = await ComponentType.create({
      name: "Banner",
      slug: "banner",
      isRepeatable: false,
      fields: [
        { key: "headline", label: "Headline", type: "TEXT", required: true, order: 0 },
      ],
    });

    const instance = await ComponentInstance.create({
      organization: org._id,
      componentType: ct._id,
      page: "home",
      order: 0,
      values: [{ key: "headline", value: "Initial Headline" }],
    });

    vi.spyOn(authModule, "requireEditor").mockImplementation(async () => {
      return User.findById(editor._id);
    });

    // Save 30 times
    for (let i = 1; i <= 30; i++) {
      const res = await saveInstanceValuesAction(String(instance._id), {
        headline: `Headline Save ${i}`,
      });
      expect(res.success).toBe(true);
    }

    const editorAfter30 = await User.findById(editor._id);
    expect(editorAfter30?.updatesUsedInPeriod).toBe(30);

    // 31st save attempt
    const res31 = await saveInstanceValuesAction(String(instance._id), {
      headline: "Headline Save 31 Should Fail",
    });

    expect(res31.success).toBe(false);
    expect(res31.error).toBe(
      "You've used all 30 of your updates for this period. Ask your admin if you need more."
    );

    // Verify DB was NOT written on rejected save
    const instanceAfterFail = await ComponentInstance.findById(instance._id);
    expect(
      instanceAfterFail?.values.find((v: { key: string }) => v.key === "headline")?.value
    ).toBe("Headline Save 30");
  });

  it("resets updatesUsedInPeriod automatically when 30 days have passed", async () => {
    const org = await Organization.create({
      name: "Period Org",
      slug: "period-org",
      type: "COMPANY",
      ownerEmail: "owner@period.com",
    });

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

    const editor = await User.create({
      email: "editor2@period.com",
      role: "EDITOR",
      organizations: [org._id],
      updateQuota: 30,
      updatesUsedInPeriod: 30, // maxed out
      quotaPeriodStart: thirtyOneDaysAgo,
    });

    const ct = await ComponentType.create({
      name: "Banner",
      slug: "banner",
      isRepeatable: false,
      fields: [
        { key: "headline", label: "Headline", type: "TEXT", required: true, order: 0 },
      ],
    });

    const instance = await ComponentInstance.create({
      organization: org._id,
      componentType: ct._id,
      page: "home",
      order: 0,
      values: [{ key: "headline", value: "Initial Headline" }],
    });

    vi.spyOn(authModule, "requireEditor").mockImplementation(async () => {
      return User.findById(editor._id);
    });

    const res = await saveInstanceValuesAction(String(instance._id), {
      headline: "Headline New Period",
    });

    expect(res.success).toBe(true);

    const updatedEditor = await User.findById(editor._id);
    expect(updatedEditor?.updatesUsedInPeriod).toBe(1);
    expect(updatedEditor?.quotaPeriodStart.getTime()).toBeGreaterThan(
      thirtyOneDaysAgo.getTime()
    );
  });

  it("allows superadmin to reset editor quota via resetEditorQuotaAction", async () => {
    const superadmin = await User.create({
      email: "superadmin@cms.com",
      role: "SUPERADMIN",
      magicIssuer: "did:magic:admin1",
    });

    const editor = await User.create({
      email: "editor3@quota.com",
      role: "EDITOR",
      magicIssuer: "did:magic:editor3",
      updateQuota: 30,
      updatesUsedInPeriod: 30,
      quotaPeriodStart: new Date(Date.now() - 10000),
    });

    vi.spyOn(authModule, "requireSuperadmin").mockImplementation(async () => {
      return User.findById(superadmin._id);
    });

    const res = await resetEditorQuotaAction(String(editor._id));
    expect(res.success).toBe(true);

    const resetEditor = await User.findById(editor._id);
    expect(resetEditor?.updatesUsedInPeriod).toBe(0);
  });
});
