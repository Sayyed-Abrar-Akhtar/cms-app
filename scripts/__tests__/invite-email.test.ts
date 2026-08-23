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

  it("sendEditorInviteEmail helper sends email via Resend SDK with subject containing org name and greeting", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg_123" }, error: null });

    const result = await sendEditorInviteEmail({
      to: "editor@test.com",
      organizationName: "Acme Corp",
      name: "Alice Smith",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "CMS <cms@sayyedabrarakhtar.com.np>",
        to: "editor@test.com",
        subject: "You've been added to Acme Corp",
        html: expect.stringContaining("<h2>Hi Alice Smith,</h2>"),
        text: expect.stringContaining("Hi Alice Smith,"),
      })
    );
  });

  it("sendEditorInviteEmail falls back to generic greeting when name is absent or blank", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg_124" }, error: null });

    const result = await sendEditorInviteEmail({
      to: "editor2@test.com",
      organizationName: "Beta Corp",
      name: "   ",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("<h2>You've been invited to Beta Corp</h2>"),
        text: expect.stringContaining("You've been invited to Beta Corp"),
      })
    );
    expect(mockSend).not.toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Hi ,"),
      })
    );
  });

  it("invites a new editor with a name, saving name to User doc and including greeting in email", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg_125" }, error: null });

    const org = await Organization.create({
      name: "Pym Tech",
      slug: "pym-tech",
      type: "COMPANY",
      ownerEmail: "hank@pym.com",
    });

    const res = await inviteEditorAction(org._id.toString(), "hope@pym.com", "Hope van Dyne");

    expect(res.success).toBe(true);
    const user = await User.findOne({ email: "hope@pym.com" });
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Hope van Dyne");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hope@pym.com",
        html: expect.stringContaining("<h2>Hi Hope van Dyne,</h2>"),
      })
    );
  });

  it("attaching existing editor to a second org with blank name doesn't erase saved name", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_126" }, error: null });

    const org1 = await Organization.create({
      name: "Org One",
      slug: "org-one",
      type: "COMPANY",
      ownerEmail: "owner1@org.com",
    });

    const org2 = await Organization.create({
      name: "Org Two",
      slug: "org-two",
      type: "COMPANY",
      ownerEmail: "owner2@org.com",
    });

    // First invite with name
    await inviteEditorAction(org1._id.toString(), "shared@editor.com", "Carol Danvers");
    let user = await User.findOne({ email: "shared@editor.com" });
    expect(user?.name).toBe("Carol Danvers");

    mockSend.mockReset();
    mockSend.mockResolvedValueOnce({ data: { id: "msg_127" }, error: null });

    // Second invite to org2 with empty name
    const res2 = await inviteEditorAction(org2._id.toString(), "shared@editor.com", "");

    expect(res2.success).toBe(true);
    user = await User.findOne({ email: "shared@editor.com" });
    expect(user?.name).toBe("Carol Danvers"); // Name retained!
    expect(user?.organizations).toHaveLength(2);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "shared@editor.com",
        html: expect.stringContaining("<h2>Hi Carol Danvers,</h2>"),
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
