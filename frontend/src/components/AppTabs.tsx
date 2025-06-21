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
  { id: 'dashboard', label: 'SPC Dashboard', href: '/dashboard' },
];

interface AppTabsProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export default function AppTabs({ activeTab = 'items', onTabChange }: AppTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabClick = (tab: Tab) => {
    if (tab.id === 'dashboard') {
      router.push(tab.href);
    } else {
      onTabChange?.(tab.id);
    }
  };

  const isActive = (tab: Tab) => {
    if (pathname === '/dashboard' && tab.id === 'dashboard') return true;
    if (pathname === '/' && tab.id !== 'dashboard') return activeTab === tab.id;
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