"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { FieldShell, type FieldProps } from "./FieldShell";
import { uploadImageToCloudinary } from "./upload-image";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function isEmptyDoc(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return true;
  const content = (doc as { content?: unknown[] }).content;
  if (!Array.isArray(content) || content.length === 0) return true;
  // A single empty paragraph counts as empty
  return content.every((node) => {
    const n = node as { type?: string; content?: unknown[] };
    return (
      (n.type === "paragraph" || n.type === "heading") &&
      (!Array.isArray(n.content) || n.content.length === 0)
    );
  });
}

/**
 * Rich text per AGENTS.md §6: bold, italic, links, H2/H3, lists, blockquote,
 * controlled images only. The JSON document is what gets stored — the server
 * re-sanitizes it on save (lib/validate-field.ts), this is just the editor.
 */
export function RichTextField({ field, value, onChange }: FieldProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        },
        // Off-brand or disallowed per the restricted schema:
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
      // No paste/drop upload handlers are registered, so the only way an
      // image gets in is the toolbar button below (signed Cloudinary flow).
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: isEmptyDoc(value) ? EMPTY_DOC : (value as object),
    editorProps: {
      attributes: {
        class: "cms-prose focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      const json = e.getJSON();
      onChange(isEmptyDoc(json) ? null : json);
    },
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx) =>
      ctx.editor
        ? {
            bold: ctx.editor.isActive("bold"),
            italic: ctx.editor.isActive("italic"),
            link: ctx.editor.isActive("link"),
            h2: ctx.editor.isActive("heading", { level: 2 }),
            h3: ctx.editor.isActive("heading", { level: 3 }),
            bulletList: ctx.editor.isActive("bulletList"),
            orderedList: ctx.editor.isActive("orderedList"),
            blockquote: ctx.editor.isActive("blockquote"),
          }
        : null,
  });

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = window.prompt("Link URL (https://…)");
    if (!href) return;
    editor.chain().focus().setLink({ href }).run();
  }

  async function handleImageFile(file: File) {
    if (!editor) return;
    setUploadError(null);
    setUploading(true);
    try {
      const secureUrl = await uploadImageToCloudinary(file);
      editor.chain().focus().setImage({ src: secureUrl }).run();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed — try again."
      );
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  const buttonClass = (active: boolean) =>
    `rounded px-2 py-1 font-mono text-xs transition-colors ${
      active
        ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
        : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
    }`;

  return (
    <FieldShell field={field}>
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-background)] focus-within:border-[var(--color-accent)]">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] px-2 py-1">
          <button
            type="button"
            className={buttonClass(editorState?.bold ?? false)}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            className={`${buttonClass(editorState?.italic ?? false)} italic`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            className={buttonClass(editorState?.link ?? false)}
            onClick={toggleLink}
            disabled={!editor}
            title="Link"
          >
            [link]
          </button>
          <span className="mx-1 text-[var(--color-border)]">|</span>
          <button
            type="button"
            className={buttonClass(editorState?.h2 ?? false)}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            className={buttonClass(editorState?.h3 ?? false)}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor}
            title="Heading 3"
          >
            H3
          </button>
          <span className="mx-1 text-[var(--color-border)]">|</span>
          <button
            type="button"
            className={buttonClass(editorState?.bulletList ?? false)}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
            title="Bullet list"
          >
            • list
          </button>
          <button
            type="button"
            className={buttonClass(editorState?.orderedList ?? false)}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
            title="Ordered list"
          >
            1. list
          </button>
          <button
            type="button"
            className={buttonClass(editorState?.blockquote ?? false)}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
            title="Quote"
          >
            &gt; quote
          </button>
          <span className="mx-1 text-[var(--color-border)]">|</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageFile(file);
            }}
          />
          <button
            type="button"
            className={buttonClass(false)}
            onClick={() => imageInputRef.current?.click()}
            disabled={!editor || uploading}
            title="Insert image (uploads through Cloudinary)"
          >
            {uploading ? "Uploading…" : "Insert image"}
          </button>
        </div>

        <EditorContent editor={editor} />
      </div>
      {uploadError && (
        <p className="font-sans text-xs text-[var(--color-danger)]">{uploadError}</p>
      )}
    </FieldShell>
  );
}
