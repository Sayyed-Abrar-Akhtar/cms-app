import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

describe("Strategic Geo Content Seed Script Tests", () => {
  let mongod: MongoMemoryServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Organization: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ComponentType: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ComponentInstance: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let seedMain: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const orgMod = await import("../../models/Organization");
    const compTypeMod = await import("../../models/ComponentType");
    const compInstMod = await import("../../models/ComponentInstance");
    const seedMod = await import("../seed-strategic-geo-content");

    Organization = orgMod.Organization;
    ComponentType = compTypeMod.ComponentType;
    ComponentInstance = compInstMod.ComponentInstance;
    seedMain = seedMod.main;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Organization.deleteMany({});
    await ComponentType.deleteMany({});
    await ComponentInstance.deleteMany({});
    vi.restoreAllMocks();
  });

  it("exits with error if target organization does not exist", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit called with code ${code}`);
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(seedMain()).rejects.toThrow("process.exit called with code 1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No organization found with slug "strategic-geo-explorer-pvt-ltd"')
    );
  });

  it("seeds component types and instances when target organization exists", async () => {
    const org = await Organization.create({
      name: "Strategic Geo Explorer Pvt. Ltd.",
      slug: "strategic-geo-explorer-pvt-ltd",
      type: "COMPANY",
      ownerEmail: "owner@strategicgeo.com",
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as unknown as (code?: string | number | null | undefined) => never);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await seedMain();

    // Verify component types created
    const componentTypes = await ComponentType.find({});
    expect(componentTypes).toHaveLength(5);
    const slugs = componentTypes.map((ct: { slug: string }) => ct.slug).sort();
    expect(slugs).toEqual([
      "community-initiative",
      "project",
      "service",
      "team-member",
      "testimonial",
    ]);

    // Verify component instances created for this org
    const instances = await ComponentInstance.find({ organization: org._id });
    expect(instances.length).toBe(7 + 6 + 8 + 2 + 2); // 25 total

    const serviceInstances = await ComponentInstance.find({ page: "services" });
    expect(serviceInstances).toHaveLength(7);

    const projectInstances = await ComponentInstance.find({ page: "projects" });
    expect(projectInstances).toHaveLength(6);

    const teamInstances = await ComponentInstance.find({ page: "about" });
    expect(teamInstances).toHaveLength(8);

    const testimonialInstances = await ComponentInstance.find({ page: "home" });
    expect(testimonialInstances).toHaveLength(2);

    const communityInstances = await ComponentInstance.find({ page: "community" });
    expect(communityInstances).toHaveLength(2);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("runs idempotently without duplicating instances when re-run", async () => {
    const org = await Organization.create({
      name: "Strategic Geo Explorer Pvt. Ltd.",
      slug: "strategic-geo-explorer-pvt-ltd",
      type: "COMPANY",
      ownerEmail: "owner@strategicgeo.com",
    });

    vi.spyOn(process, "exit").mockImplementation((() => {}) as unknown as (code?: string | number | null | undefined) => never);
    vi.spyOn(console, "log").mockImplementation(() => {});

    // First run
    await seedMain();
    const countFirst = await ComponentInstance.countDocuments({ organization: org._id });
    expect(countFirst).toBe(25);

    // Second run
    await seedMain();
    const countSecond = await ComponentInstance.countDocuments({ organization: org._id });
    expect(countSecond).toBe(25);
  });
});
