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
    } else {
      // Always navigate to the main page for non-SPC dashboard tabs
      router.push(tab.href);
      // Still call onTabChange for the main page if it's provided
      onTabChange?.(tab.id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, tab: Tab, index: number) => {
    let newIndex = index;
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = index > 0 ? index - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = index < tabs.length - 1 ? index + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleTabClick(tab);
        return;
      default:
        return;
    }
    
    // Focus the new tab
    const newTab = document.getElementById(`tab-${tabs[newIndex].id}`);
    newTab?.focus();
  };

  const isActive = (tab: Tab) => {
    // Check if we're on any SPC dashboard page (including dynamic routes)
    if (pathname.startsWith('/spc-dashboard') && tab.id === 'spc-dashboard') return true;
    if (pathname === '/' && tab.id !== 'spc-dashboard') return activeTab === tab.id;
    return false;
  };

  const hasTabPanel = (tab: Tab) => {
    // Only tabs that have associated tab panels on the same page
    return tab.id !== 'spc-dashboard';
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" role="tablist" aria-label="Main navigation">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => handleTabClick(tab)}
            onKeyDown={(event) => handleKeyDown(event, tab, index)}
            role="tab"
            aria-selected={isActive(tab)}
            aria-controls={hasTabPanel(tab) ? `panel-${tab.id}` : undefined}
            tabIndex={isActive(tab) ? 0 : -1}
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