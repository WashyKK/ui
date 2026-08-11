import { cookies } from "next/headers";
import Link from "next/link";
import AdminTabs from "./admin-tabs";

export default async function AdminPage() {
  const jar = await cookies();
  const isAdmin = jar.get("admin")?.value === "1";
  const isManager = jar.get("manager")?.value === "1";

  if (!isAdmin && !isManager) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground mt-2">Please log in to manage products.</p>
        <div className="mt-4">
          <Link href="/admin/login" className="px-4 py-2 rounded-md bg-foreground text-background">Go to Login</Link>
        </div>
      </div>
    );
  }
  return <AdminTabs isAdmin={isAdmin} />;
}
