import React from "react";

type JsonMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: JsonMark[];
  content?: JsonNode[];
};

export type RichTextRendererProps = {
  content: JsonNode | string | null | undefined;
  className?: string;
};

function renderTextNode(node: JsonNode, key: string | number): React.ReactNode {
  let element: React.ReactNode = node.text || "";

  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (mark.type === "bold") {
        element = <strong>{element}</strong>;
      } else if (mark.type === "italic") {
        element = <em>{element}</em>;
      } else if (mark.type === "link" && typeof mark.attrs?.href === "string") {
        element = (
          <a
            href={mark.attrs.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[var(--color-accent)] underline hover:opacity-80"
          >
            {element}
          </a>
        );
      }
    }
  }

  return <React.Fragment key={key}>{element}</React.Fragment>;
}

function renderNode(node: JsonNode, key: string | number): React.ReactNode {
  if (!node || typeof node !== "object") return null;

  switch (node.type) {
    case "doc":
      return (
        <React.Fragment key={key}>
          {Array.isArray(node.content) &&
            node.content.map((child, idx) => renderNode(child, idx))}
        </React.Fragment>
      );

    case "paragraph":
      return (
        <p key={key} className="my-2 leading-relaxed text-[var(--color-foreground)]">
          {Array.isArray(node.content)
            ? node.content.map((child, idx) => renderNode(child, idx))
            : null}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level;
      if (level === 3) {
        return (
          <h3
            key={key}
            className="my-3 font-mono text-base font-semibold text-[var(--color-foreground)]"
          >
            {Array.isArray(node.content)
              ? node.content.map((child, idx) => renderNode(child, idx))
              : null}
          </h3>
        );
      }
      return (
        <h2
          key={key}
          className="my-4 font-mono text-lg font-bold text-[var(--color-foreground)]"
        >
          {Array.isArray(node.content)
            ? node.content.map((child, idx) => renderNode(child, idx))
            : null}
        </h2>
      );
    }

    case "bulletList":
      return (
        <ul key={key} className="my-3 list-disc pl-5 space-y-1 text-[var(--color-foreground)]">
          {Array.isArray(node.content) &&
            node.content.map((child, idx) => renderNode(child, idx))}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="my-3 list-decimal pl-5 space-y-1 text-[var(--color-foreground)]">
          {Array.isArray(node.content) &&
            node.content.map((child, idx) => renderNode(child, idx))}
        </ol>
      );

    case "listItem":
      return (
        <li key={key} className="leading-relaxed">
          {Array.isArray(node.content) &&
            node.content.map((child, idx) => renderNode(child, idx))}
        </li>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-3 border-l-2 border-[var(--color-accent)] pl-3 italic text-[var(--color-muted)]"
        >
          {Array.isArray(node.content) &&
            node.content.map((child, idx) => renderNode(child, idx))}
        </blockquote>
      );

    case "hardBreak":
      return <br key={key} />;

    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!src) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={src}
          alt={alt}
          className="my-4 w-full max-w-lg aspect-video object-cover rounded border border-[var(--color-border)]"
        />
      );
    }

    case "text":
      return renderTextNode(node, key);

    default:
      if (Array.isArray(node.content)) {
        return (
          <React.Fragment key={key}>
            {node.content.map((child, idx) => renderNode(child, idx))}
          </React.Fragment>
        );
      }
      return null;
  }
}

/**
 * Shared component for rendering Tiptap JSON content read-only using React elements.
 * Never uses `dangerouslySetInnerHTML`.
 */
export function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
  let doc: JsonNode | null = null;

  if (typeof content === "string") {
    try {
      doc = JSON.parse(content);
    } catch {
      doc = null;
    }
  } else if (content && typeof content === "object") {
    doc = content;
  }

  if (!doc) return null;

  return (
    <div className={`font-sans text-sm text-[var(--color-foreground)] ${className}`}>
      {renderNode(doc, "root")}
    </div>
  );
}
