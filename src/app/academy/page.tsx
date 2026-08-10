import { redirect } from "next/navigation";

/**
 * The academy sign-up form used to collect a name, email and area of interest
 * and hand them to a `mailto:` addressed to a personal Gmail account — so
 * enquiries were unlogged, went to the wrong inbox, and only worked at all if
 * the visitor had a desktop mail client configured.
 *
 * Leads now go to /contact, which writes to contact_messages.
 */
export default function AcademyPage() {
  redirect("/contact");
}
