"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { FieldShell, type FieldProps } from "./FieldShell";
import { uploadImageToCloudinary } from "./upload-image";

export function RichTextField({ field, value, onChange }: FieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: "w-full max-w-lg aspect-video object-cover rounded my-4 border border-[var(--color-border)]",
        },
      }),
    ],
    content:
      typeof value === "object" && value !== null
        ? value
        : typeof value === "string" && value.trim().startsWith("{")
        ? JSON.parse(value)
        : null,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    immediatelyRender: false,
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setUploading(true);
    setError(null);

    try {
      const url = await uploadImageToCloudinary(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed — try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleSetLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  return (
    <FieldShell field={field}>
      <div className="space-y-2 rounded border border-[var(--color-border)] bg-[var(--color-background)] p-2">
        {editor && (
          <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] pb-2 font-mono text-xs">
            {/* Bold */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Format bold text"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("bold")
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              B
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Format italic text"
              className={`rounded px-2 py-1 italic transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("italic")
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              I
            </button>

            {/* H2 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="Format heading level 2"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("heading", { level: 2 })
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              H2
            </button>

            {/* H3 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              aria-label="Format heading level 3"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("heading", { level: 3 })
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              H3
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Format bullet list"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("bulletList")
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              • List
            </button>

            {/* Ordered List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Format ordered list"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("orderedList")
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              1. List
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              aria-label="Format blockquote"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("blockquote")
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              “Quote”
            </button>

            {/* Link */}
            <button
              type="button"
              onClick={handleSetLink}
              aria-label="Format link"
              className={`rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                editor.isActive("link")
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-bold"
                  : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              Link
            </button>

            {/* Insert image */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Insert image"
              className="rounded bg-[var(--color-accent-dim)] px-2 py-1 text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-background)] disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
            >
              {uploading ? "Uploading…" : "Insert image"}
            </button>
          </div>
        )}

        <EditorContent
          editor={editor}
          className="min-h-[120px] px-2 py-1 font-sans text-sm text-[var(--color-foreground)] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-[var(--color-accent)] [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_h2]:my-2 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ol]:my-1 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ul]:my-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_a]:text-[var(--color-accent)] [&_.ProseMirror_a]:underline"
        />

        {error && (
          <p className="font-sans text-xs text-[var(--color-danger)]">
            [image error] {error}
          </p>
        )}
      </div>
    </FieldShell>
  );
}
