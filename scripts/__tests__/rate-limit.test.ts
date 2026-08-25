import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

describe("Rate Limiting Tests", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checkEmailPOST: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let verifyPOST: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publicApiGET: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const orgMod = await import("../../models/Organization");
    const checkEmailMod = await import("../../app/api/auth/check-email/route");
    const verifyMod = await import("../../app/api/auth/verify/route");
    const publicApiMod = await import("../../app/api/public/[orgSlug]/[page]/route");

    Organization = orgMod.Organization;
    checkEmailPOST = checkEmailMod.POST;
    verifyPOST = verifyMod.POST;
    publicApiGET = publicApiMod.GET;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Organization.deleteMany({});
  });

  it("legitimate single request is completely unaffected", async () => {
    const req = new Request("http://localhost/api/auth/check-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "192.168.1.100",
      },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await checkEmailPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ exists: false });
  });

  it("hitting check-email rapidly from the same source gets rate-limited with 429 and Retry-After header", async () => {
    const ip = "10.0.0.1";
    let lastRes: Response | null = null;

    // Default rate limit is 10 requests per minute
    for (let i = 0; i < 11; i++) {
      const req = new Request("http://localhost/api/auth/check-email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({ email: `user${i}@example.com` }),
      });
      lastRes = await checkEmailPOST(req);
    }

    expect(lastRes).not.toBeNull();
    expect(lastRes!.status).toBe(429);
    const body = await lastRes!.json();
    expect(body).toEqual({ error: "Too Many Requests" });

    const retryAfter = lastRes!.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);

    const remaining = lastRes!.headers.get("X-RateLimit-Remaining");
    expect(remaining).toBe("0");
  });

  it("hitting verify rapidly from the same source gets rate-limited with 429 and Retry-After header", async () => {
    const ip = "10.0.0.2";
    let lastRes: Response | null = null;

    for (let i = 0; i < 11; i++) {
      const req = new Request("http://localhost/api/auth/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({ didToken: "invalid_token" }),
      });
      lastRes = await verifyPOST(req);
    }

    expect(lastRes).not.toBeNull();
    expect(lastRes!.status).toBe(429);
    const body = await lastRes!.json();
    expect(body).toEqual({ error: "Too Many Requests" });

    const retryAfter = lastRes!.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("public API rate limit is scoped per-organization (hitting limit on Org A does not starve Org B)", async () => {
    const orgA = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      type: "COMPANY",
      ownerEmail: "owner@alpha.com",
    });

    const orgB = await Organization.create({
      name: "Org Beta",
      slug: "org-beta",
      type: "COMPANY",
      ownerEmail: "owner@beta.com",
    });

    const clientIp = "172.16.0.50";

    // Hit Org A 10 times (filling up quota for org-alpha + clientIp)
    for (let i = 0; i < 10; i++) {
      const reqA = new Request(`http://localhost/api/public/org-alpha/home`, {
        headers: {
          "x-api-key": orgA.publicApiKey,
          "x-forwarded-for": clientIp,
        },
      });
      const resA = await publicApiGET(reqA, {
        params: Promise.resolve({ orgSlug: "org-alpha", page: "home" }),
      });
      expect(resA.status).toBe(200);
    }

    // 11th request to Org A should be rate-limited (429)
    const reqA11 = new Request(`http://localhost/api/public/org-alpha/home`, {
      headers: {
        "x-api-key": orgA.publicApiKey,
        "x-forwarded-for": clientIp,
      },
    });
    const resA11 = await publicApiGET(reqA11, {
      params: Promise.resolve({ orgSlug: "org-alpha", page: "home" }),
    });
    expect(resA11.status).toBe(429);
    expect(resA11.headers.get("Retry-After")).not.toBeNull();

    // 1st request from SAME clientIp to Org B should succeed (200), because limit is per orgSlug + IP
    const reqB = new Request(`http://localhost/api/public/org-beta/home`, {
      headers: {
        "x-api-key": orgB.publicApiKey,
        "x-forwarded-for": clientIp,
      },
    });
    const resB = await publicApiGET(reqB, {
      params: Promise.resolve({ orgSlug: "org-beta", page: "home" }),
    });
    expect(resB.status).toBe(200);
  });
});
