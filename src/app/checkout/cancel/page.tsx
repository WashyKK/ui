import Link from "next/link";
import { XCircle } from "lucide-react";

export default function CancelPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm p-10 text-center space-y-5">
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-50 dark:bg-zinc-800 p-4 border">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Payment Cancelled</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your payment was not completed and you have not been charged.
            You can return to the store whenever you are ready.
          </p>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
          >
            Back to Store
          </Link>
          <a
            href="/contact"
            className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition"
          >
            Contact Sales
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="/contact"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Reach our team
          </a>
        </p>
      </div>
    </div>
  );
}
