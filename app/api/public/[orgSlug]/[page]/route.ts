/**
 * Public Read-Only Content API
 *
 * Used by client frontend sites (e.g. separate Next.js deployments) to fetch
 * page content and component instances for an organization.
 *
 * Example fetch call from a consuming client frontend:
 *
 * ```ts
 * const res = await fetch("https://cms.sayyedabrarakhtar.com.np/api/public/acme-corp/home", {
 *   headers: {
 *     "x-api-key": process.env.CMS_PUBLIC_API_KEY!,
 *   },
 *   next: { revalidate: 60 },
 * });
 *
 * if (!res.ok) {
 *   throw new Error(`Failed to fetch CMS page content: ${res.status}`);
 * }
 *
 * const data = await res.json();
 * // Example response shape:
 * // {
 * //   organization: {
 * //     name: "Acme Corp",
 * //     slug: "acme-corp",
 * //     type: "COMPANY"
 * //   },
 * //   page: "home",
 * //   components: [
 * //     {
 * //       type: "banner",
 * //       order: 0,
 * //       values: {
 * //         headline: "Welcome to Acme",
 * //         subheadline: "Leading innovation"
 * //       }
 * //     }
 * //   ]
 * // }
 * ```
 */

import { NextResponse } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { ComponentInstance } from "@/models/ComponentInstance";
// Ensure ComponentType model is registered for populate
import "@/models/ComponentType";

export type PublicApiResponse = {
  organization: {
    name: string;
    slug: string;
    type: "COMPANY" | "INDIVIDUAL";
  };
  page: string;
  components: Array<{
    type: string;
    order: number;
    values: Record<string, unknown>;
  }>;
};

async function getCachedPageData(orgSlug: string, page: string) {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag(`public-api-${orgSlug}`);

  await connectDB();

  const org = await Organization.findOne({ slug: orgSlug }).lean();
  if (!org) return null;

  const instances = await ComponentInstance.find({
    organization: org._id,
    page,
  })
    .sort({ order: 1 })
    .populate("componentType")
    .lean();

  const components = instances.map((inst) => {
    const compType = inst.componentType as unknown as {
      slug?: string;
      fields?: Array<{ key: string }>;
    };

    const valuesObj: Record<string, unknown> = {};

    // Initialize fields defined on ComponentType to null as default
    if (compType && Array.isArray(compType.fields)) {
      for (const field of compType.fields) {
        if (field && field.key) {
          valuesObj[field.key] = null;
        }
      }
    }

    // Populate actual stored values
    if (Array.isArray(inst.values)) {
      for (const entry of inst.values) {
        if (entry && entry.key !== undefined) {
          valuesObj[entry.key] = entry.value;
        }
      }
    }

    return {
      type: compType?.slug || "",
      order: inst.order ?? 0,
      values: valuesObj,
    };
  });

  return {
    organization: {
      name: org.name,
      slug: org.slug,
      type: org.type,
      publicApiKey: org.publicApiKey,
    },
    page,
    components,
  };
}

type RouteContext = {
  params: Promise<{ orgSlug: string; page: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug, page } = await context.params;

  const data = await getCachedPageData(orgSlug, page);

  // Return generic 401 if org doesn't exist or key does not match to avoid enumeration
  if (!data || data.organization.publicApiKey !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Strip publicApiKey from response body
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { publicApiKey, ...organization } = data.organization;

  return NextResponse.json({
    organization,
    page: data.page,
    components: data.components,
  });
}

// Reject non-GET HTTP methods with 405 Method Not Allowed
export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
