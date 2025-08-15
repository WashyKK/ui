"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Academy() {
  const [form, setForm] = useState({ name: "", email: "", interest: "" });
  const [open, setOpen] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Academy Inquiry — Elffie Robotics");
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nInterest: ${form.interest}\n\nPlease share program details.`,
    );
    return `mailto:washingtonkigan@gmail.com?subject=${subject}&body=${body}`;
  }, [form]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div role="dialog" aria-modal="true" className="max-w-lg w-full rounded-2xl border bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold">Join Elffie Academy</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-sm text-muted-foreground hover:opacity-80">Close</button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Fill the quick details below, then email us directly. We’ll get back to you with program schedules and next steps.</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={handleChange} placeholder="Your full name" />
              </div>
              <div>
                <Label htmlFor="email">Your Email</Label>
                <Input id="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="interest">Area of Interest</Label>
                <Input id="interest" value={form.interest} onChange={handleChange} placeholder="Humanoid, mobile, mechatronics..." />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <a href={mailtoHref} className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition">Email Us</a>
              <Button variant="outline" onClick={() => setOpen(false)}>Maybe Later</Button>
            </div>
          </div>
        </div>
      )}

      <h1 className="mb-4 text-3xl font-bold">Elffie Robotics Academy</h1>
      <p className="mb-6 text-gray-700 dark:text-gray-300">
        Our academy offers hands-on training in robotics. Students learn the fundamentals of mechatronics, programming, and control while building real humanoid and mobile robots.
      </p>
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
        <h2 className="text-xl font-semibold">Prefer email?</h2>
        <p className="text-sm text-muted-foreground mt-2">You can reach us directly at the link below.</p>
        <div className="mt-3">
          <a href={mailtoHref} className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition">Email Academy</a>
        </div>
      </div>
    </div>
  );
}
