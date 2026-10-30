import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex">
        <AdminSidebar />
        <main className="min-h-screen flex-1 bg-cream px-8 py-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
