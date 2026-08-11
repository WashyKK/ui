"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown, ChevronUp, FileText, ImagePlus, Link2, Loader2, Plus,
  Terminal, Trash2, Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/components/admin/image-upload";
import {
  DOCUMENT_KINDS, SNIPPET_LANGUAGES,
  type ProductDocumentInput, type ProductImageInput,
  type ProductLinkInput, type ProductSnippetInput,
} from "@/lib/product-resources";

const field =
  "w-full rounded-sm border border-input bg-background px-2.5 py-1.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring";

/** Move an item within a list, used by every editor's reorder buttons. */
function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function SectionHeader({
  icon, title, count, hint, onAdd, addLabel,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  hint: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-2.5">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium">
          {icon}{title}
          {count > 0 && <span className="text-xs text-muted-foreground tabular-nums">({count})</span>}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      {onAdd && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1.5 shrink-0">
          <Plus className="h-3 w-3" />{addLabel}
        </Button>
      )}
    </div>
  );
}

function RowControls({
  index, total, onMove, onRemove, label,
}: {
  index: number;
  total: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <button
        type="button" onClick={() => onMove(index - 1)} disabled={index === 0}
        aria-label={`Move ${label} up`}
        className="p-1 rounded-sm hover:bg-muted disabled:opacity-25 transition-colors"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        type="button" onClick={() => onMove(index + 1)} disabled={index === total - 1}
        aria-label={`Move ${label} down`}
        className="p-1 rounded-sm hover:bg-muted disabled:opacity-25 transition-colors"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
      <button
        type="button" onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="p-1 rounded-sm hover:bg-destructive/10 text-destructive transition-colors"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Images ──────────────────────────────────────────────────────────────── */

export function ImagesEditor({
  images, onChange,
}: {
  images: ProductImageInput[];
  onChange: (next: ProductImageInput[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded: ProductImageInput[] = [];
      for (const file of Array.from(files).slice(0, 12)) {
        uploaded.push({ url: await uploadFile("/api/products/upload-image", file), alt: "" });
      }
      onChange([...images, ...uploaded].slice(0, 12));
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section>
      <SectionHeader
        icon={<ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />}
        title="Images" count={images.length}
        hint="The first is the thumbnail. Add the connector face, the mounting pattern, the rating label."
        onAdd={() => inputRef.current?.click()} addLabel="Add"
      />
      <input
        ref={inputRef} type="file" multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
      />

      {uploading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </p>
      )}
      {error && <p className="text-xs text-destructive py-1">{error}</p>}

      {images.length === 0 && !uploading ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-sm border border-dashed py-6 text-xs text-muted-foreground hover:border-graphite transition-colors"
        >
          No images yet — click to add one or more
        </button>
      ) : (
        <ul className="space-y-2">
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`} className="flex gap-2.5 items-start rounded-sm border p-2">
              <div className="relative h-14 w-14 shrink-0 rounded-sm border bg-muted overflow-hidden">
                <Image src={image.url} alt="" fill className="object-contain p-1" sizes="56px" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {i === 0 && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded-sm px-1 py-0.5">
                    Thumbnail
                  </span>
                )}
                <input
                  className={field}
                  value={image.alt ?? ""}
                  onChange={(e) => {
                    const next = [...images];
                    next[i] = { ...image, alt: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Describe the shot — e.g. USB-C end, pin labels visible"
                />
              </div>
              <RowControls
                index={i} total={images.length} label="image"
                onMove={(to) => onChange(move(images, i, to))}
                onRemove={() => onChange(images.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Documents ───────────────────────────────────────────────────────────── */

export function DocumentsEditor({
  documents, onChange,
}: {
  documents: ProductDocumentInput[];
  onChange: (next: ProductDocumentInput[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      const added: ProductDocumentInput[] = [];
      for (const file of Array.from(files).slice(0, 20)) {
        added.push({
          url: await uploadFile("/api/products/upload-datasheet", file),
          // Filename is a far better default title than "Document".
          title: file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").slice(0, 160),
          kind: "datasheet",
        });
      }
      onChange([...documents, ...added].slice(0, 20));
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section>
      <SectionHeader
        icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
        title="Documents" count={documents.length}
        hint="Datasheet, manual, drawing, certificate. The first datasheet becomes the headline PDF."
        onAdd={() => inputRef.current?.click()} addLabel="Add PDF"
      />
      <input
        ref={inputRef} type="file" multiple accept="application/pdf"
        className="sr-only"
        onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
      />

      {uploading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </p>
      )}
      {error && <p className="text-xs text-destructive py-1">{error}</p>}

      {documents.length === 0 && !uploading ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-sm border border-dashed py-6 text-xs text-muted-foreground hover:border-graphite transition-colors"
        >
          No documents yet — click to add one or more PDFs
        </button>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc, i) => (
            <li key={`${doc.url}-${i}`} className="flex gap-2.5 items-start rounded-sm border p-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  className={field}
                  value={doc.title}
                  onChange={(e) => {
                    const next = [...documents];
                    next[i] = { ...doc, title: e.target.value };
                    onChange(next);
                  }}
                  placeholder="What is this document?"
                />
                <div className="flex gap-2">
                  <select
                    className={`${field} w-40`}
                    value={doc.kind ?? "datasheet"}
                    onChange={(e) => {
                      const next = [...documents];
                      next[i] = { ...doc, kind: e.target.value };
                      onChange(next);
                    }}
                  >
                    {DOCUMENT_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>{k.label}</option>
                    ))}
                  </select>
                  <a
                    href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground self-center"
                  >
                    Open
                  </a>
                </div>
              </div>
              <RowControls
                index={i} total={documents.length} label="document"
                onMove={(to) => onChange(move(documents, i, to))}
                onRemove={() => onChange(documents.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Links ───────────────────────────────────────────────────────────────── */

export function LinksEditor({
  links, onChange,
}: {
  links: ProductLinkInput[];
  onChange: (next: ProductLinkInput[]) => void;
}) {
  return (
    <section>
      <SectionHeader
        icon={<Link2 className="h-3.5 w-3.5 text-muted-foreground" />}
        title="Helpful links" count={links.length}
        hint="Manufacturer page, driver library, wiring guide, a video that explains it."
        onAdd={() => onChange([...links, { url: "", title: "", description: "" }])}
        addLabel="Add link"
      />

      {links.length === 0 ? (
        <p className="rounded-sm border border-dashed py-6 text-center text-xs text-muted-foreground">
          No links yet
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link, i) => (
            <li key={i} className="flex gap-2.5 items-start rounded-sm border p-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  className={field} value={link.title}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...link, title: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Title — e.g. Espressif ESP32-S2 datasheet hub"
                />
                <input
                  className={field} value={link.url} type="url"
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...link, url: e.target.value };
                    onChange(next);
                  }}
                  placeholder="https://…"
                />
                {link.url && !/^https?:\/\//i.test(link.url) && (
                  <p className="text-xs text-destructive">Must start with http:// or https://</p>
                )}
                <input
                  className={field} value={link.description ?? ""}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...link, description: e.target.value };
                    onChange(next);
                  }}
                  placeholder="One line on why it is useful (optional)"
                />
              </div>
              <RowControls
                index={i} total={links.length} label="link"
                onMove={(to) => onChange(move(links, i, to))}
                onRemove={() => onChange(links.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Snippets ────────────────────────────────────────────────────────────── */

export function SnippetsEditor({
  snippets, onChange,
}: {
  snippets: ProductSnippetInput[];
  onChange: (next: ProductSnippetInput[]) => void;
}) {
  return (
    <section>
      <SectionHeader
        icon={<Terminal className="h-3.5 w-3.5 text-muted-foreground" />}
        title="Code snippets" count={snippets.length}
        hint="A wiring example or a short read loop. This is what stops the pre-sales email."
        onAdd={() =>
          onChange([...snippets, { title: "", language: "arduino", code: "", description: "" }])
        }
        addLabel="Add snippet"
      />

      {snippets.length === 0 ? (
        <p className="rounded-sm border border-dashed py-6 text-center text-xs text-muted-foreground">
          No snippets yet
        </p>
      ) : (
        <ul className="space-y-2">
          {snippets.map((snippet, i) => (
            <li key={i} className="rounded-sm border p-2 space-y-1.5">
              <div className="flex gap-2 items-start">
                <input
                  className={`${field} flex-1`} value={snippet.title}
                  onChange={(e) => {
                    const next = [...snippets];
                    next[i] = { ...snippet, title: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Title — e.g. Read the sensor over I²C"
                />
                <select
                  className={`${field} w-36`}
                  value={snippet.language ?? "text"}
                  onChange={(e) => {
                    const next = [...snippets];
                    next[i] = { ...snippet, language: e.target.value };
                    onChange(next);
                  }}
                >
                  {SNIPPET_LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <RowControls
                  index={i} total={snippets.length} label="snippet"
                  onMove={(to) => onChange(move(snippets, i, to))}
                  onRemove={() => onChange(snippets.filter((_, j) => j !== i))}
                />
              </div>
              <input
                className={field} value={snippet.description ?? ""}
                onChange={(e) => {
                  const next = [...snippets];
                  next[i] = { ...snippet, description: e.target.value };
                  onChange(next);
                }}
                placeholder="One line of context (optional)"
              />
              <textarea
                rows={6}
                spellCheck={false}
                className={`${field} font-mono text-[12px] leading-relaxed`}
                value={snippet.code}
                onChange={(e) => {
                  const next = [...snippets];
                  next[i] = { ...snippet, code: e.target.value };
                  onChange(next);
                }}
                placeholder="#include <Wire.h>&#10;&#10;void setup() {&#10;  Wire.begin();&#10;}"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
