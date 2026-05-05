import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm p-10 text-center space-y-5">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-50 dark:bg-green-950/40 p-4 border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Order Confirmed</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you for your purchase. A confirmation email has been sent to you.
            Our team will be in touch with shipping details shortly.
          </p>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/store"
            className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
          >
            Continue Shopping
          </Link>
          <a
            href="mailto:washingtonkigan@gmail.com?subject=Order%20Follow-up%20%E2%80%94%20Elffie%20Robotics"
            className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition"
          >
            Contact Support
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Questions? Email{" "}
          <a
            href="mailto:washingtonkigan@gmail.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            washingtonkigan@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
