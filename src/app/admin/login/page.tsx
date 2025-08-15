"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Login failed");
  };

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="text-sm text-muted-foreground mb-4">Use the credentials set in .env</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full">Login</Button>
      </form>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}

