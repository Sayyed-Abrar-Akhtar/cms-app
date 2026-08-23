import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Mock requireSuperadmin for regenerateApiKeyAction and next/cache functions for Vitest environment
vi.mock("@/lib/auth", () => ({
  requireSuperadmin: async () => ({ role: "SUPERADMIN", email: "admin@example.com" }),
  getCurrentUser: async () => ({ role: "SUPERADMIN", email: "admin@example.com" }),
}));

vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

describe("Public Read-Only API (/api/public/[orgSlug]/[page])", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ComponentType: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ComponentInstance: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let regenerateApiKeyAction: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const orgMod = await import("../../models/Organization");
    const compTypeMod = await import("../../models/ComponentType");
    const compInstMod = await import("../../models/ComponentInstance");
    const routeMod = await import("../../app/api/public/[orgSlug]/[page]/route");
    const actionsMod = await import("../../app/dashboard/organizations/actions");

    Organization = orgMod.Organization;
    ComponentType = compTypeMod.ComponentType;
    ComponentInstance = compInstMod.ComponentInstance;
    GET = routeMod.GET;
    POST = routeMod.POST;
    regenerateApiKeyAction = actionsMod.regenerateApiKeyAction;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Organization.deleteMany({});
    await ComponentType.deleteMany({});
    await ComponentInstance.deleteMany({});
  });

  it("returns 401 when x-api-key header is missing or invalid", async () => {
    const org = await Organization.create({
      name: "Acme Corp",
      slug: "acme-corp",
      type: "COMPANY",
      ownerEmail: "owner@acme.com",
    });

    // 1. Missing header
    const reqNoHeader = new Request("http://localhost/api/public/acme-corp/home");
    const resNoHeader = await GET(reqNoHeader, {
      params: Promise.resolve({ orgSlug: "acme-corp", page: "home" }),
    });
    expect(resNoHeader.status).toBe(401);
    const bodyNoHeader = await resNoHeader.json();
    expect(bodyNoHeader).toEqual({ error: "Unauthorized" });

    // 2. Invalid header
    const reqBadHeader = new Request("http://localhost/api/public/acme-corp/home", {
      headers: { "x-api-key": "invalid_api_key_123" },
    });
    expect(org.publicApiKey).not.toBe("invalid_api_key_123");

    const resBadHeader = await GET(reqBadHeader, {
      params: Promise.resolve({ orgSlug: "acme-corp", page: "home" }),
    });
    expect(resBadHeader.status).toBe(401);
    const bodyBadHeader = await resBadHeader.json();
    expect(bodyBadHeader).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 with generic error when orgSlug does not exist, leaking no org data", async () => {
    const req = new Request("http://localhost/api/public/nonexistent-org/home", {
      headers: { "x-api-key": "some_key" },
    });

    const res = await GET(req, {
      params: Promise.resolve({ orgSlug: "nonexistent-org", page: "home" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when a valid key for Org A is used against Org B", async () => {
    const orgA = await Organization.create({
      name: "Org A",
      slug: "org-a",
      type: "COMPANY",
      ownerEmail: "a@org.com",
    });

    const orgB = await Organization.create({
      name: "Org B",
      slug: "org-b",
      type: "INDIVIDUAL",
      ownerEmail: "b@org.com",
    });

    // Try accessing Org B's page using Org A's key
    const req = new Request("http://localhost/api/public/org-b/home", {
      headers: { "x-api-key": orgA.publicApiKey },
    });

    const res = await GET(req, {
      params: Promise.resolve({ orgSlug: "org-b", page: "home" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(orgA.publicApiKey).not.toBe(orgB.publicApiKey);
  });

  it("returns expected JSON structure for valid key and real component instances", async () => {
    const org = await Organization.create({
      name: "Stark Industries",
      slug: "stark-industries",
      type: "COMPANY",
      ownerEmail: "tony@stark.com",
    });

    const bannerType = await ComponentType.create({
      name: "Banner",
      slug: "banner",
      isRepeatable: false,
      fields: [
        { key: "headline", label: "Headline", type: "TEXT", required: true, order: 0 },
        { key: "subheading", label: "Subheading", type: "TEXT", required: false, order: 1 },
      ],
    });

    const projectCardType = await ComponentType.create({
      name: "Project Card",
      slug: "project-card",
      isRepeatable: true,
      fields: [
        { key: "title", label: "Title", type: "TEXT", required: true, order: 0 },
        { key: "description", label: "Description", type: "TEXT", required: false, order: 1 },
      ],
    });

    // Create Component Instances on "home"
    await ComponentInstance.create({
      organization: org._id,
      componentType: bannerType._id,
      page: "home",
      order: 0,
      values: [
        { key: "headline", value: "I am Iron Man" },
        { key: "subheading", value: "Arc Reactor v2" },
      ],
    });

    await ComponentInstance.create({
      organization: org._id,
      componentType: projectCardType._id,
      page: "home",
      order: 1,
      values: [
        { key: "title", value: "Mark 85 Suit" },
        { key: "description", value: "Nanotech armor" },
      ],
    });

    const req = new Request("http://localhost/api/public/stark-industries/home", {
      headers: { "x-api-key": org.publicApiKey },
    });

    const res = await GET(req, {
      params: Promise.resolve({ orgSlug: "stark-industries", page: "home" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toEqual({
      organization: {
        name: "Stark Industries",
        slug: "stark-industries",
        type: "COMPANY",
      },
      page: "home",
      components: [
        {
          type: "banner",
          order: 0,
          values: {
            headline: "I am Iron Man",
            subheading: "Arc Reactor v2",
          },
        },
        {
          type: "project-card",
          order: 1,
          values: {
            title: "Mark 85 Suit",
            description: "Nanotech armor",
          },
        },
      ],
    });
    // Ensure publicApiKey is NOT leaked in the response body
    expect(json.organization.publicApiKey).toBeUndefined();
  });

  it("immediately invalidates the old API key when regenerated", async () => {
    const org = await Organization.create({
      name: "Wayne Enterprises",
      slug: "wayne-enterprises",
      type: "COMPANY",
      ownerEmail: "bruce@wayne.com",
    });

    const oldKey = org.publicApiKey;

    // First request with old key succeeds
    const reqOld = new Request("http://localhost/api/public/wayne-enterprises/home", {
      headers: { "x-api-key": oldKey },
    });
    const resOldInitial = await GET(reqOld, {
      params: Promise.resolve({ orgSlug: "wayne-enterprises", page: "home" }),
    });
    expect(resOldInitial.status).toBe(200);

    // Regenerate API key via action
    const regenRes = await regenerateApiKeyAction(org._id.toString());
    expect(regenRes.success).toBe(true);
    const newKey = regenRes.data.publicApiKey;
    expect(newKey).not.toBe(oldKey);

    // Querying with old key now fails with 401
    const resOldAfter = await GET(reqOld, {
      params: Promise.resolve({ orgSlug: "wayne-enterprises", page: "home" }),
    });
    expect(resOldAfter.status).toBe(401);

    // Querying with new key succeeds with 200
    const reqNew = new Request("http://localhost/api/public/wayne-enterprises/home", {
      headers: { "x-api-key": newKey },
    });
    const resNew = await GET(reqNew, {
      params: Promise.resolve({ orgSlug: "wayne-enterprises", page: "home" }),
    });
    expect(resNew.status).toBe(200);
  });

  it("returns 405 Method Not Allowed for non-GET methods", async () => {
    const resPost = await POST();
    expect(resPost.status).toBe(405);
    const body = await resPost.json();
    expect(body).toEqual({ error: "Method Not Allowed" });
  });
});
