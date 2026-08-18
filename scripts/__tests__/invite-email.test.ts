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

// Mock Resend SDK
const mockSend = vi.fn();
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

describe("Transactional Email & Editor Invite Notification Tests", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let User: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inviteEditorAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sendEditorInviteEmail: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    process.env.RESEND_API_KEY = "test_key_123";
    process.env.RESEND_FROM_EMAIL = "CMS <cms@sayyedabrarakhtar.com.np>";
    await mongoose.connect(uri);

    const userMod = await import("../../models/User");
    const orgMod = await import("../../models/Organization");
    const actionsMod = await import("../../app/dashboard/organizations/actions");
    const emailMod = await import("../../lib/email");

    User = userMod.User;
    Organization = orgMod.Organization;
    inviteEditorAction = actionsMod.inviteEditorAction;
    sendEditorInviteEmail = emailMod.sendEditorInviteEmail;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    mockSend.mockReset();
  });

  it("sendEditorInviteEmail helper sends email via Resend SDK with subject containing org name", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg_123" }, error: null });

    const result = await sendEditorInviteEmail({
      to: "editor@test.com",
      organizationName: "Acme Corp",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "CMS <cms@sayyedabrarakhtar.com.np>",
        to: "editor@test.com",
        subject: "You've been added to Acme Corp",
      })
    );
  });

  it("triggers email send on successful editor invite for a new user", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg_456" }, error: null });

    const org = await Organization.create({
      name: "Stark Industries",
      slug: "stark-industries",
      type: "COMPANY",
      ownerEmail: "tony@stark.com",
    });

    const res = await inviteEditorAction(org._id.toString(), "peter@stark.com");

    expect(res.success).toBe(true);
    expect(res.warning).toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "peter@stark.com",
        subject: "You've been added to Stark Industries",
      })
    );

    const user = await User.findOne({ email: "peter@stark.com" });
    expect(user).not.toBeNull();
    expect(user?.organizations).toHaveLength(1);
  });

  it("does NOT send an email when re-inviting an editor already attached to the same org", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg_789" }, error: null });

    const org = await Organization.create({
      name: "Wayne Enterprises",
      slug: "wayne-enterprises",
      type: "COMPANY",
      ownerEmail: "bruce@wayne.com",
    });

    // First invite
    const res1 = await inviteEditorAction(org._id.toString(), "bruce@wayne.com");
    expect(res1.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockSend.mockReset();

    // Second invite to same org
    const res2 = await inviteEditorAction(org._id.toString(), "bruce@wayne.com");
    expect(res2.success).toBe(true);
    expect(res2.message).toContain("already attached");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("leaves editor attached in DB and returns a warning if email send fails", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid API Key or Domain not verified" },
    });

    const org = await Organization.create({
      name: "Oscorp",
      slug: "oscorp",
      type: "COMPANY",
      ownerEmail: "norman@oscorp.com",
    });

    const res = await inviteEditorAction(org._id.toString(), "harry@oscorp.com");

    expect(res.success).toBe(true);
    expect(res.warning).toContain(
      "Editor added, but the notification email failed to send — share the login link with them directly."
    );

    // Verify DB still attached editor
    const user = await User.findOne({ email: "harry@oscorp.com" });
    expect(user).not.toBeNull();
    expect(user?.organizations).toHaveLength(1);
  });
});
