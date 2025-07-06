"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface Tab {
  id: string;
  label: string;
  href: string;
}

interface AppTabsProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export default function AppTabs({
  activeTab = "items",
  onTabChange,
}: AppTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Define all tabs
  const allTabs: Tab[] = [
    {
      id: "spc-dashboard",
      label: "SPC Dashboard",
      href: "/spc-dashboard/SPC_CD_L1/1000-BNT44",
    },
    {
      id: "spc-analytics",
      label: "SPC Analytics",
      href: "/spc-analytics/SPC_CD_L1/1000-BNT44",
    },
    { id: "items", label: "To Do Items", href: "/todo-items" },
  ];

  // Filter tabs based on user permissions
  const tabs = allTabs.filter((tab) => {
    // Only show To Do Items tab to superusers
    if (tab.id === "items") {
      return user?.is_superuser === true;
    }
    // Show all other tabs to everyone
    return true;
  });

  const handleTabClick = (tab: Tab) => {
    router.push(tab.href);
  };

  const isActive = (tab: Tab) => {
    if (tab.id === "spc-dashboard" && pathname.startsWith("/spc-dashboard"))
      return true;
    if (tab.id === "spc-analytics" && pathname.startsWith("/spc-analytics"))
      return true;
    if (tab.id === "items" && pathname.startsWith("/todo-items")) return true;
    return false;
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              isActive(tab)
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
