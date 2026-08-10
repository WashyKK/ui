"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export async function uploadFile(endpoint: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}

/** Drop-or-paste image picker. Extracted so the product sheet stays readable. */
export default function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadFile("/api/products/upload-image", file));
    } catch (e: any) {
      setError(e.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex rounded-sm border overflow-hidden text-xs w-fit">
        {(["upload", "url"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 transition-colors ${
              tab === t ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {t === "upload" ? "Upload" : "Paste URL"}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="relative flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-input hover:border-graphite transition-colors cursor-pointer h-36 bg-muted/40"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-5 w-5 animate-bounce" />
              <span className="text-xs">Uploading…</span>
            </div>
          ) : value ? (
            <>
              <Image src={value} alt="" fill className="object-contain p-2" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 bg-obsidian/70 hover:bg-obsidian text-bone rounded-sm p-1 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground pointer-events-none">
              <ImageIcon className="h-7 w-7 opacity-25" />
              <span className="text-xs">Click or drop an image</span>
              <span className="text-[10px]">JPEG, PNG, WebP, GIF · max 10 MB</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
          />
          {value && (
            <div className="relative h-24 w-24 rounded-sm overflow-hidden border bg-muted">
              <Image src={value} alt="" fill className="object-contain" />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
