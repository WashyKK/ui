"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Academy() {
  const [form, setForm] = useState({ name: "", email: "", interest: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
    alert("Thank you for your interest!");
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Elffie Robotics Academy</h1>
      <p className="mb-6 text-gray-700">
        Our academy offers hands-on training in robotics. Students learn the
        fundamentals of mechatronics, programming and control while building
        real humanoid and mobile robots.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="interest">Area of Interest</Label>
          <Input
            id="interest"
            value={form.interest}
            onChange={handleChange}
            placeholder="Humanoid, mobile, etc."
          />
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}
