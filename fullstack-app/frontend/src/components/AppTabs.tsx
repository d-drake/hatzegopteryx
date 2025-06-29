'use client';

import { useRouter, usePathname } from 'next/navigation';

interface Tab {
  id: string;
  label: string;
  href: string;
}

const tabs: Tab[] = [
  { id: 'items', label: 'Todo Items', href: '/' },
  { id: 'cd-data', label: 'CD Data Analytics', href: '/?tab=cd-data' },
  { id: 'spc-dashboard', label: 'SPC Dashboard', href: '/spc-dashboard' },
];

interface AppTabsProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export default function AppTabs({ activeTab = 'items', onTabChange }: AppTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabClick = (tab: Tab) => {
    if (tab.id === 'spc-dashboard') {
      router.push(tab.href);
    } else if (pathname.startsWith('/spc-dashboard')) {
      // When on SPC dashboard, navigate back to home for other tabs
      router.push(tab.href);
    } else {
      // When on home page, use the callback if provided
      onTabChange?.(tab.id);
    }
  };

  const isActive = (tab: Tab) => {
    if (pathname.startsWith('/spc-dashboard') && tab.id === 'spc-dashboard') return true;
    if (pathname === '/' && tab.id !== 'spc-dashboard') return activeTab === tab.id;
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}