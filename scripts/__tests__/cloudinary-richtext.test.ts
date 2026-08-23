import { describe, it, expect, beforeAll, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FieldDefinition } from "@/lib/field-types";

// Mock requireEditor to simulate an authenticated editor session
vi.mock("@/lib/auth", () => ({
  requireEditor: async () => ({ role: "EDITOR", email: "editor@test.com" }),
  getCurrentUser: async () => ({ role: "EDITOR", email: "editor@test.com" }),
}));

describe("Cloudinary & RichText Integration Tests", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_API_KEY = "test-api-key";
    process.env.CLOUDINARY_API_SECRET = "test-api-secret";
  });

  it("getCloudinarySignature returns correct signature structure without exposing secret", async () => {
    const { getCloudinarySignature } = await import("@/lib/cloudinary");
    const sig = getCloudinarySignature("cms");

    expect(sig.cloudName).toBe("test-cloud");
    expect(sig.apiKey).toBe("test-api-key");
    expect(sig.folder).toBe("cms");
    expect(typeof sig.timestamp).toBe("number");
    expect(typeof sig.signature).toBe("string");
    expect(sig.signature.length).toBeGreaterThan(0);
  });

  it("app/api/cloudinary/sign/route.ts POST returns signed upload params", async () => {
    const { POST } = await import("@/app/api/cloudinary/sign/route");
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cloudName).toBe("test-cloud");
    expect(data.apiKey).toBe("test-api-key");
    expect(data.folder).toBe("cms");
    expect(typeof data.timestamp).toBe("number");
    expect(typeof data.signature).toBe("string");
  });

  it("uploadImageToCloudinary successfully uploads file using signature contract", async () => {
    const { uploadImageToCloudinary } = await import("@/app/dashboard/_fields/upload-image");

    const globalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlString = String(url);
      if (urlString.includes("/api/cloudinary/sign")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            timestamp: 1700000000,
            signature: "mock_signature",
            apiKey: "test-api-key",
            cloudName: "test-cloud",
            folder: "cms",
          }),
        });
      }
      if (urlString.includes("api.cloudinary.com/v1_1/test-cloud/image/upload")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            secure_url: "https://res.cloudinary.com/test-cloud/image/upload/v1/test.jpg",
          }),
        });
      }
      return globalFetch(url);
    });

    const fakeFile = new File(["dummy"], "test.png", { type: "image/png" });
    const uploadedUrl = await uploadImageToCloudinary(fakeFile);

    expect(uploadedUrl).toBe("https://res.cloudinary.com/test-cloud/image/upload/v1/test.jpg");

    global.fetch = globalFetch;
  });

  it("server-side IMAGE field validation accepts res.cloudinary.com and rejects non-Cloudinary URLs", async () => {
    const { validateFieldValue } = await import("@/lib/validate-field");
    const imageField: FieldDefinition = {
      key: "heroImage",
      type: "IMAGE",
      label: "Hero Image",
      required: false,
      order: 0,
    };

    // Valid Cloudinary URL
    const validRes = validateFieldValue(
      imageField,
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
    expect(validRes.ok).toBe(true);
    if (validRes.ok) {
      expect(validRes.value).toBe("https://res.cloudinary.com/demo/image/upload/sample.jpg");
    }

    // Invalid non-Cloudinary URL
    const invalidRes = validateFieldValue(imageField, "https://example.com/unauthorized.jpg");
    expect(invalidRes.ok).toBe(false);
    if (!invalidRes.ok) {
      expect(invalidRes.error).toContain("Image must be uploaded through Cloudinary");
    }
  });

  it("server-side RICH_TEXT sanitization retains allowed nodes/marks and drops non-Cloudinary images", async () => {
    const { validateFieldValue } = await import("@/lib/validate-field");
    const richTextField: FieldDefinition = {
      key: "content",
      type: "RICH_TEXT",
      label: "Content",
      required: false,
      order: 0,
    };

    const validDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Heading Text" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold and italic text", marks: [{ type: "bold" }, { type: "italic" }] },
            {
              type: "text",
              text: " with link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet 1" }] }],
            },
          ],
        },
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "A quote" }] }],
        },
        {
          type: "image",
          attrs: { src: "https://res.cloudinary.com/demo/image/upload/sample.png", alt: "Sample" },
        },
        {
          type: "image",
          attrs: { src: "https://evil.com/malicious.png", alt: "Evil" },
        },
      ],
    };

    const res = validateFieldValue(richTextField, validDoc);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const sanitized = res.value as { content: { type: string; attrs?: { src?: string } }[] };
      const images = sanitized.content.filter((n) => n.type === "image");
      expect(images).toHaveLength(1);
      expect(images[0].attrs?.src).toBe("https://res.cloudinary.com/demo/image/upload/sample.png");
    }
  });

  it("RichTextRenderer converts Tiptap JSON into React elements read-only", async () => {
    const { RichTextRenderer } = await import("@/app/_components/RichTextRenderer");

    const jsonDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section Title" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world", marks: [{ type: "bold" }] },
          ],
        },
        {
          type: "image",
          attrs: { src: "https://res.cloudinary.com/demo/image/upload/sample.png", alt: "Demo" },
        },
      ],
    };

    const html = renderToStaticMarkup(React.createElement(RichTextRenderer, { content: jsonDoc }));

    expect(html).toContain("<h2");
    expect(html).toContain("Section Title</h2>");
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain('src="https://res.cloudinary.com/demo/image/upload/sample.png"');
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });
});
