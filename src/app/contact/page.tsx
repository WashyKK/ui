import type { Metadata } from "next";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Request a quote",
  description:
    "Ask for pricing, lead times or a bulk quote on industrial sensors, control gear and automation parts.",
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <p className="label-micro text-muted-foreground mb-3">Contact</p>
      <h1 className="display-headline text-4xl sm:text-5xl mb-4">Request a quote</h1>
      <p className="text-muted-foreground mb-10 max-w-prose">
        Tell us the part, the quantity and when you need it. If you have a
        datasheet or a drawing, mention the part number and we will match it.
        Quotes usually come back the same working day.
      </p>

      <ContactForm />
    </div>
  );
}
