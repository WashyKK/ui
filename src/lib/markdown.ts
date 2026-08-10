/**
 * A deliberately small Markdown subset for product descriptions.
 *
 * Raw HTML is not passed through — it is escaped before any parsing happens.
 * The description field is writable by anyone holding the manager cookie, so
 * treating it as trusted HTML would turn "edit a product" into stored XSS
 * against every visitor to that page.
 *
 * Supports what a spec description actually needs: paragraphs, headings, bold,
 * italic, inline code, links, and both list kinds. Anything else renders as the
 * literal characters typed, which is the safe failure.
 */

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

/** http(s) and mailto only — no javascript:, no data:. */
function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return /^(https?:\/\/|mailto:|\/)/i.test(trimmed) ? trimmed : null;
}

function inline(text: string): string {
  let out = escapeHtml(text);

  // Code first, so its contents are not then treated as emphasis.
  out = out.replace(/`([^`]+)`/g, '<code class="rounded-sm bg-muted px-1 py-0.5 text-[0.9em]">$1</code>');

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, rawHref) => {
    const href = safeHref(rawHref);
    if (!href) return label;
    const external = /^https?:\/\//i.test(href);
    const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${href}" class="underline underline-offset-2 hover:text-foreground"${rel}>${label}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-medium text-foreground">$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  return out;
}

/** Returns an HTML string safe to hand to dangerouslySetInnerHTML. */
export function renderMarkdown(source: string): string {
  if (!source?.trim()) return "";

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listKind) {
      html.push(`</${listKind}>`);
      listKind = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length + 2; // # -> h3, ## -> h4, ### -> h5
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? "ul" : "ol";
      if (listKind !== kind) {
        closeList();
        html.push(`<${kind}>`);
        listKind = kind;
      }
      html.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  return html.join("");
}
