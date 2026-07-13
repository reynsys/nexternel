"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/admin/devices", label: "Devices" },
  { href: "/admin/rooms", label: "Areas" },
  { href: "/admin/automations", label: "Automations" },
];

export function NavBar({ username }: { username?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Nexternel
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {username && (
            <span className="hidden text-sm text-[var(--muted)] sm:inline">{username}</span>
          )}
          <button onClick={logout} className="btn-secondary text-xs">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
