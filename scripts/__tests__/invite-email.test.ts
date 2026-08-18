import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.mock("@/lib/auth", () => ({
  requireSuperadmin: async () => ({ role: "SUPERADMIN", email: "admin@cms.com" }),
  getCurrentUser: async () => ({ role: "SUPERADMIN", email: "admin@cms.com" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

let mongod: MongoMemoryServer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let User: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Organization: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let inviteEditorAction: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let removeEditorAction: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailModule: any;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  process.env.RESEND_API_KEY = "re_test_key_123";
  await mongoose.connect(uri);

  const userMod = await import("../../models/User");
  const orgMod = await import("../../models/Organization");
  const actionsMod = await import("../../app/dashboard/organizations/actions");
  emailModule = await import("../../lib/email");

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
  vi.restoreAllMocks();
});

describe("Invite Editor Email Notifications", () => {
  it("sends email notification when inviting a new editor", async () => {
    const sendEmailSpy = vi
      .spyOn(emailModule, "sendEditorInviteEmail")
      .mockResolvedValue({ success: true });

    const org = await Organization.create({
      name: "Acme Corp",
      slug: "acme-corp",
      type: "COMPANY",
      ownerEmail: "owner@acme.com",
    });

    const res = await inviteEditorAction(org._id.toString(), "neweditor@acme.com");

    expect(res.success).toBe(true);
    expect(res.warning).toBeUndefined();
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith({
      to: "neweditor@acme.com",
      organizationName: "Acme Corp",
    });

    const user = await User.findOne({ email: "neweditor@acme.com" });
    expect(user).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(user?.organizations.map((id: any) => id.toString())).toContain(org._id.toString());
  });

  it("returns warning if email sending fails but retains editor in database", async () => {
    const sendEmailSpy = vi
      .spyOn(emailModule, "sendEditorInviteEmail")
      .mockResolvedValue({ success: false, error: "SMTP timeout" });

    const org = await Organization.create({
      name: "Beta Inc",
      slug: "beta-inc",
      type: "INDIVIDUAL",
      ownerEmail: "owner@beta.com",
    });

    const res = await inviteEditorAction(org._id.toString(), "editor@beta.com");

    expect(res.success).toBe(true);
    expect(res.warning).toContain("notification email failed to send");
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);

    const user = await User.findOne({ email: "editor@beta.com" });
    expect(user).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(user?.organizations.map((id: any) => id.toString())).toContain(org._id.toString());
  });

  it("does not send email when re-inviting an editor already attached to the same organization", async () => {
    const sendEmailSpy = vi
      .spyOn(emailModule, "sendEditorInviteEmail")
      .mockResolvedValue({ success: true });

    const org = await Organization.create({
      name: "Gamma Co",
      slug: "gamma-co",
      type: "COMPANY",
      ownerEmail: "owner@gamma.com",
    });

    // First invite
    await inviteEditorAction(org._id.toString(), "repeat@gamma.com");
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);

    // Second invite to same org
    sendEmailSpy.mockClear();
    const res2 = await inviteEditorAction(org._id.toString(), "repeat@gamma.com");

    expect(res2.success).toBe(true);
    expect(res2.message).toContain("already attached");
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  it("does not send email when removing an editor from an organization", async () => {
    const sendEmailSpy = vi
      .spyOn(emailModule, "sendEditorInviteEmail")
      .mockResolvedValue({ success: true });

    const org = await Organization.create({
      name: "Delta LLC",
      slug: "delta-llc",
      type: "COMPANY",
      ownerEmail: "owner@delta.com",
    });

    await inviteEditorAction(org._id.toString(), "removeme@delta.com");
    sendEmailSpy.mockClear();

    const user = await User.findOne({ email: "removeme@delta.com" });
    const removeRes = await removeEditorAction(org._id.toString(), user!._id.toString());

    expect(removeRes.success).toBe(true);
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });
});
