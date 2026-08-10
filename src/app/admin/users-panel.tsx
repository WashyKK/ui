"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Loader2, MailPlus, ShieldCheck, ShieldX, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Grid from "@/components/admin/grid";
import InviteSheet from "./invite-sheet";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  role: string | null;
  owner: boolean;
  invited: boolean;
  created_at: string | null;
  last_sign_in: string | null;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<{ email: string; role: string | null } | null>(null);
  const [revoking, setRevoking] = useState<UserRow | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load users");
      setUsers(data.users ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (user: UserRow) => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not revoke that");
      setRevoking(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const columns = useMemo<ColDef<UserRow>[]>(() => [
    {
      headerName: "User",
      field: "email",
      pinned: "left",
      minWidth: 240,
      flex: 2,
      cellRenderer: (p: ICellRendererParams<UserRow>) => {
        const u = p.data;
        if (!u) return null;
        return (
          <div className="flex items-center gap-2.5 py-1.5">
            {u.avatar ? (
              <Image src={u.avatar} alt="" width={26} height={26} className="rounded-full shrink-0" />
            ) : (
              <span className="h-[26px] w-[26px] rounded-full bg-muted grid place-items-center shrink-0">
                <User className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
            <span className="min-w-0 leading-tight">
              {u.name && <span className="block font-medium truncate">{u.name}</span>}
              <span className="block text-xs text-muted-foreground truncate">{u.email}</span>
            </span>
          </div>
        );
      },
    },
    {
      headerName: "Access",
      field: "role",
      minWidth: 150,
      valueGetter: (p) =>
        p.data?.owner ? "Owner"
          : p.data?.role === "admin" ? "Platform admin"
          : p.data?.role === "store_manager" ? "Store manager"
          : "Customer",
      cellRenderer: (p: ICellRendererParams<UserRow>) => {
        const u = p.data;
        if (!u) return null;
        if (u.owner) {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-3 w-3" /> Owner
            </span>
          );
        }
        if (u.role === "admin") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-3 w-3" /> Platform admin
            </span>
          );
        }
        if (u.role === "store_manager") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Wrench className="h-3 w-3" /> Store manager
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">Customer</span>;
      },
    },
    {
      headerName: "Status",
      field: "invited",
      minWidth: 130,
      valueGetter: (p) => (p.data?.invited ? "Invited" : "Active"),
      cellRenderer: (p: ICellRendererParams<UserRow>) =>
        p.data?.invited ? (
          <span
            className="text-[10px] uppercase tracking-wide border rounded-sm px-1.5 py-0.5 text-muted-foreground"
            title="Invited but has not signed in yet — access applies on first sign-in"
          >
            Invited
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Active</span>
        ),
    },
    { headerName: "Provider", field: "provider", minWidth: 110 },
    {
      headerName: "Joined",
      field: "created_at",
      minWidth: 120,
      valueFormatter: (p) => fmt(p.value),
    },
    {
      headerName: "Last sign in",
      field: "last_sign_in",
      minWidth: 130,
      valueFormatter: (p) => fmt(p.value),
    },
    {
      headerName: "",
      colId: "actions",
      minWidth: 190,
      flex: 0,
      width: 190,
      sortable: false,
      filter: false,
      pinned: "right",
      cellRenderer: (p: ICellRendererParams<UserRow>) => {
        const u = p.data;
        if (!u) return null;
        if (u.owner) {
          return <span className="text-xs text-muted-foreground">Set by ADMIN_EMAIL</span>;
        }
        return (
          <span className="flex items-center gap-1.5 py-1">
            <Button
              size="sm" variant="outline" className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditing({ email: u.email, role: u.role });
                setSheetOpen(true);
              }}
            >
              {u.role ? "Change" : "Grant access"}
            </Button>
            {u.role && (
              <Button
                size="sm" variant="outline"
                className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setRevoking(u); }}
              >
                <ShieldX className="h-3 w-3" />
              </Button>
            )}
          </span>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">People</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform admins can manage everything including other admins. Store
            managers can only manage products and orders.
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setSheetOpen(true); }}
          className="gap-2 shrink-0"
        >
          <MailPlus className="h-4 w-4" /> Invite
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <Grid
        rowData={users}
        columnDefs={columns}
        exportName="elffie-people"
        loading={loading}
        height={520}
        overlayNoRowsTemplate={
          '<span class="text-sm text-muted-foreground">Nobody has signed in yet.</span>'
        }
      />

      <InviteSheet
        open={sheetOpen}
        existing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />

      {/* Revoke confirmation, also right-side, so the admin never sees a
          centred dialog fighting a sheet. */}
      <InviteRevokeSheet
        user={revoking}
        working={working}
        onCancel={() => setRevoking(null)}
        onConfirm={() => revoking && revoke(revoking)}
      />
    </div>
  );
}

function InviteRevokeSheet({
  user, working, onCancel, onConfirm,
}: {
  user: UserRow | null;
  working: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Revoke access?</SheetTitle>
        </SheetHeader>
        <div className="flex-1 px-6 py-5 space-y-3">
          <p className="text-sm">
            <span className="font-medium">{user?.email}</span> will lose access to
            the admin panel the next time they sign in.
          </p>
          <p className="text-xs text-muted-foreground">
            Their customer account and order history are untouched — this only
            removes the staff role.
          </p>
        </div>
        <div className="border-t px-6 py-4 flex gap-2 bg-muted/30">
          <Button variant="destructive" className="flex-1 gap-2" onClick={onConfirm} disabled={working}>
            {working && <Loader2 className="h-4 w-4 animate-spin" />} Revoke
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={working}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
