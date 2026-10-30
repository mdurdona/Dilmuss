"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/use-permissions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/admin", label: "Boshqaruv paneli", exact: true, permission: "ORDER_VIEW" },
  { href: "/admin/orders", label: "Buyurtmalar", permission: "ORDER_VIEW" },
  { href: "/admin/products", label: "Mahsulotlar", permission: "PRODUCT_VIEW" },
  { href: "/admin/categories", label: "Kategoriyalar", permission: "PRODUCT_VIEW" },
  { href: "/admin/inventory", label: "Ombor", permission: "INVENTORY_VIEW" },
  { href: "/admin/branches", label: "Filiallar", permission: "BRANCH_VIEW" },
  { href: "/admin/customers", label: "Foydalanuvchilar", permission: "CUSTOMER_VIEW" },
  { href: "/admin/users", label: "Adminlar", permission: "ADMIN_VIEW" },
  { href: "/admin/settings", label: "Sozlamalar", permission: "SYSTEM_SETTINGS_VIEW" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { has, loading: permissionsLoading } = usePermissions();
  const router = useRouter();
  const visibleNav = NAV.filter((item) => !item.permission || permissionsLoading || has(item.permission));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-5 py-5">
        <Link href="/admin">
          <Logo />
        </Link>
        <p className="mt-1 text-xs text-muted">{user?.role === "SUPERADMIN" ? "Superadmin panel" : "Admin panel"}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                active ? "bg-brand-light text-brand" : "text-ink/80 hover:bg-brand-light"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line px-5 py-4 text-xs text-muted">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/admin/profile" className="hover:text-brand">
            <p className="text-ink">{user?.fullName}</p>
            <p>{user?.role}</p>
          </Link>
          <ThemeToggle />
        </div>
        <button
          onClick={async () => {
            if (!window.confirm("Chiqishni xohlaysizmi?")) return;
            await logout();
            router.push("/admin/login");
          }}
          className="text-brand hover:underline"
        >
          Chiqish
        </button>
      </div>
    </aside>
  );
}
