"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/auth/Header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <ProtectedRoute requireSuperuser>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-md h-[calc(100vh-64px)]">
            <nav className="p-4">
              <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/admin"
                    className={`block px-4 py-2 rounded-md transition-colors ${
                      isActive("/admin")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/users"
                    className={`block px-4 py-2 rounded-md transition-colors ${
                      isActive("/admin/users")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Users
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/registrations"
                    className={`block px-4 py-2 rounded-md transition-colors ${
                      isActive("/admin/registrations")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Registration Requests
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/audit-logs"
                    className={`block px-4 py-2 rounded-md transition-colors ${
                      isActive("/admin/audit-logs")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Audit Logs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/security"
                    className={`block px-4 py-2 rounded-md transition-colors ${
                      isActive("/admin/security")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Security
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
