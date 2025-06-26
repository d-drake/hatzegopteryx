'use client';

import { useState, useEffect } from 'react';

export function useTabState(defaultTab: string = 'timeline') {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Persist tab choice in sessionStorage
  useEffect(() => {
    const savedTab = sessionStorage.getItem('spc-active-tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  const changeTab = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem('spc-active-tab', tab);
  };

  return [activeTab, changeTab] as const;
}