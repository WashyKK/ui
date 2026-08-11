"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  datasheet: "Datasheet",
  manual: "Manual",
  drawing: "Drawing",
  certificate: "Certificate",
  application_note: "Application note",
  other: "Document",
};

export interface DocumentRow { url: string; title: string; kind: string }
export interface LinkRow { url: string; title: string; description: string | null }
export interface SnippetRow {
  title: string; language: string; code: string; description: string | null;
}

/** http(s) only — a stored URL must never become a javascript: href. */
const safe = (url: string) => /^https?:\/\//i.test(url);

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  const usable = documents.filter((d) => safe(d.url));
  if (usable.length === 0) return null;

  return (
    <section>
      <h2 className="label-micro text-muted-foreground mb-3">Documents</h2>
      <ul className="border-t">
        {usable.map((doc) => (
          <li key={doc.url} className="flex items-center gap-3 py-3 border-b">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{doc.title}</p>
              <p className="label-micro text-muted-foreground mt-0.5">
                {KIND_LABEL[doc.kind] ?? "Document"} · PDF
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={doc.url} target="_blank" rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-sm border text-xs hover:bg-muted transition-colors"
              >
                View
              </a>
              <a
                href={doc.url} download
                aria-label={`Download ${doc.title}`}
                className="p-1.5 rounded-sm border hover:bg-muted transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LinkList({ links }: { links: LinkRow[] }) {
  const usable = links.filter((l) => safe(l.url));
  if (usable.length === 0) return null;

  return (
    <section>
      <h2 className="label-micro text-muted-foreground mb-3">Helpful links</h2>
      <ul className="border-t">
        {usable.map((link) => (
          <li key={link.url} className="border-b">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-start gap-3 py-3 group"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm group-hover:underline">{link.title}</span>
                {link.description && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {link.description}
                  </span>
                )}
                <span className="block label-micro text-muted-foreground mt-1 truncate">
                  {new URL(link.url).hostname.replace(/^www\./, "")}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CodeBlock({ snippet }: { snippet: SnippetRow }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the code is selectable either way.
    }
  };

  return (
    <div className="border">
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/40">
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">{snippet.title}</p>
          {snippet.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{snippet.description}</p>
          )}
        </div>
        <span className="label-micro text-muted-foreground shrink-0">{snippet.language}</span>
        <button
          onClick={copy}
          aria-label={`Copy ${snippet.title}`}
          className="p-1.5 rounded-sm border bg-background hover:bg-muted transition-colors shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {/* Rendered as text, never as markup — this is author-supplied content. */}
      <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed font-mono bg-background">
        <code>{snippet.code}</code>
      </pre>
    </div>
  );
}

export function SnippetList({ snippets }: { snippets: SnippetRow[] }) {
  if (snippets.length === 0) return null;

  return (
    <section>
      <h2 className="label-micro text-muted-foreground mb-1">Using this part</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Starting points, not finished firmware. Check them against the datasheet.
      </p>
      <div className="space-y-3">
        {snippets.map((snippet, i) => (
          <CodeBlock key={`${snippet.title}-${i}`} snippet={snippet} />
        ))}
      </div>
    </section>
  );
}
