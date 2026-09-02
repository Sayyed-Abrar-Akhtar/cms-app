import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

describe("Global User Directory Tests", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let User: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resetEditorQuotaAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let proxy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessionMod: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authModule: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const userMod = await import("../../models/User");
    const orgMod = await import("../../models/Organization");
    const orgActionsMod = await import("../../app/dashboard/organizations/actions");
    const proxyMod = await import("../../proxy");
    sessionMod = await import("../../lib/session");
    authModule = await import("../../lib/auth");

    User = userMod.User;
    Organization = orgMod.Organization;
    resetEditorQuotaAction = orgActionsMod.resetEditorQuotaAction;
    proxy = proxyMod.proxy;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    vi.restoreAllMocks();
  });

  it("lists all users (superadmins, multi-org editors, and unattached editors) correctly in DB query", async () => {
    const superadmin = await User.create({
      email: "superadmin@cms.com",
      name: "Super Admin",
      role: "SUPERADMIN",
      magicIssuer: "did:magic:superadmin1",
    });

    const orgA = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      type: "COMPANY",
      ownerEmail: "owner@alpha.com",
    });

    const orgB = await Organization.create({
      name: "Org Beta",
      slug: "org-beta",
      type: "INDIVIDUAL",
      ownerEmail: "owner@beta.com",
    });

    const multiOrgEditor = await User.create({
      email: "multieditor@cms.com",
      name: "Multi Editor",
      role: "EDITOR",
      organizations: [orgA._id, orgB._id],
      updateQuota: 30,
      updatesUsedInPeriod: 12,
      magicIssuer: "did:magic:editor1",
    });

    const unattachedEditor = await User.create({
      email: "unattached@cms.com",
      name: null,
      role: "EDITOR",
      organizations: [], // unattached
      updateQuota: 30,
      updatesUsedInPeriod: 5,
      magicIssuer: "did:magic:editor2",
    });

    const allUsers = await User.find()
      .populate({ path: "organizations", select: "name slug" })
      .sort({ createdAt: -1 })
      .lean();

    expect(allUsers.length).toBe(3);

    const fetchedUnattached = allUsers.find(
      (u: any) => u.email === unattachedEditor.email
    );
    expect(fetchedUnattached).toBeDefined();
    expect(fetchedUnattached.organizations).toEqual([]);

    const fetchedMulti = allUsers.find(
      (u: any) => u.email === multiOrgEditor.email
    );
    expect(fetchedMulti).toBeDefined();
    expect(fetchedMulti.organizations.length).toBe(2);

    const fetchedSuperadmin = allUsers.find(
      (u: any) => u.email === superadmin.email
    );
    expect(fetchedSuperadmin).toBeDefined();
    expect(fetchedSuperadmin.role).toBe("SUPERADMIN");
  });

  it("redirects EDITOR attempting to access /dashboard/users via proxy", async () => {
    vi.spyOn(sessionMod, "verifySessionToken").mockResolvedValue({
      userId: "editor-id-123",
      email: "editor@cms.com",
      role: "EDITOR",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const req = new NextRequest("http://localhost:3000/dashboard/users");
    req.cookies.set("cms_session", "valid-editor-token");

    const res = await proxy(req);
    expect(res.status).toBe(307); // Next.js redirect HTTP status
    expect(res.headers.get("location")).toContain("/dashboard?error=");
  });

  it("resets quota for an editor from the user directory action", async () => {
    const superadmin = await User.create({
      email: "admin@cms.com",
      role: "SUPERADMIN",
      magicIssuer: "did:magic:admin_reset",
    });

    const editor = await User.create({
      email: "editor-quota@cms.com",
      role: "EDITOR",
      organizations: [],
      updateQuota: 30,
      updatesUsedInPeriod: 25,
      magicIssuer: "did:magic:editor_reset",
    });

    vi.spyOn(authModule, "requireSuperadmin").mockImplementation(async () => {
      return User.findById(superadmin._id);
    });

    const res = await resetEditorQuotaAction(String(editor._id));
    expect(res.success).toBe(true);

    const updatedEditor = await User.findById(editor._id);
    expect(updatedEditor?.updatesUsedInPeriod).toBe(0);
  });
});
