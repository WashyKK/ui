"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Role = "admin" | "store_manager";

const ROLE_OPTIONS: { id: Role; label: string; icon: React.ReactNode; can: string[] }[] = [
  {
    id: "store_manager",
    label: "Store manager",
    icon: <Wrench className="h-4 w-4" />,
    can: [
      "Create, edit and delete products",
      "Upload images and datasheets",
      "See and fulfil orders",
    ],
  },
  {
    id: "admin",
    label: "Platform admin",
    icon: <ShieldCheck className="h-4 w-4" />,
    can: [
      "Everything a store manager can do",
      "Manage categories",
      "Invite and revoke other admins and managers",
    ],
  },
];

interface InviteSheetProps {
  open: boolean;
  /** Pre-fills and locks the address when changing an existing person's role. */
  existing?: { email: string; role: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Invite someone, or change what they can do.
 *
 * The grant is keyed on email address, and sign-in resolves it by address — so
 * this works for someone who has never visited the site. They get their access
 * the first time they sign in with Google.
 */
export default function InviteSheet({ open, existing, onClose, onSaved }: InviteSheetProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("store_manager");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(existing?.email ?? "");
    setRole((existing?.role as Role) ?? "store_manager");
    setError(null);
  }, [open, existing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save that");
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{existing ? "Change access" : "Invite someone"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={Boolean(existing)}
              placeholder="colleague@company.co.ke"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {existing
                ? "Changing the role takes effect the next time they sign in."
                : "They do not need an account yet — access applies the first time they sign in with Google using this address."}
            </p>
          </div>

          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium mb-2">What can they do?</legend>
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`block rounded-sm border p-3.5 cursor-pointer transition-colors ${
                  role === option.id ? "border-foreground bg-muted/50" : "hover:border-graphite"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="role"
                    value={option.id}
                    checked={role === option.id}
                    onChange={() => setRole(option.id)}
                    className="h-3.5 w-3.5"
                  />
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
                <ul className="mt-2 ml-8 space-y-1">
                  {option.can.map((line) => (
                    <li key={line} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-steel select-none">—</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </fieldset>

          {role === "admin" && (
            <p className="flex gap-2 text-xs text-muted-foreground rounded-sm border p-3">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              A platform admin can invite and revoke other admins, including you.
              Only grant this to someone you would trust with the whole store.
            </p>
          )}

          {error && (
            <p className="flex gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{error}
            </p>
          )}
        </form>

        <div className="border-t px-6 py-4 flex gap-2 bg-muted/30">
          <Button onClick={submit} disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? "Save access" : "Send invite"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
