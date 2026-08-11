import { NextResponse } from "next/server";
import { recordPageView, recordSearch } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Public ingest for page views and searches.
 *
 * Always answers 204, whatever happened. This is fire-and-forget telemetry from
 * a visitor's browser: it must never surface an error, never slow a page, and
 * never give an attacker a signal to probe against.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return new NextResponse(null, { status: 204 });

  try {
    if (body.type === "search" && typeof body.query === "string") {
      await recordSearch(req, {
        query: body.query,
        resultsCount: Number(body.resultsCount ?? 0),
        category: typeof body.category === "string" ? body.category : null,
      });
    } else if (typeof body.path === "string") {
      await recordPageView(req, body.path);
    }
  } catch {
    // Swallow deliberately — see above.
  }

  return new NextResponse(null, { status: 204 });
}
