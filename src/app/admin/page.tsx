import { cookies } from "next/headers";
import AdminForm from "./product-form";
import Link from "next/link";

export default function AdminPage() {
  const isAdmin = cookies().get("admin")?.value === "1";
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground mt-2">Please log in to manage products.</p>
        <div className="mt-4">
          <Link href="/admin/login" className="px-4 py-2 rounded-md bg-accent text-white">Go to Login</Link>
        </div>
      </div>
    );
  }
  return <AdminForm />;
}
