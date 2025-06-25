'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ItemsSection from '@/components/ItemsSection';
import CDDataSection from '@/components/CDDataSection';
import AppTabs from '@/components/AppTabs';

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'items' | 'cd-data'>('items');
  const [apiTest, setApiTest] = useState<string>('Testing...');

  console.log('🏠 Home page render, activeTab:', activeTab);

  useEffect(() => {
    console.log('🔥 Home page useEffect triggered');
    
    // Check URL parameters for tab selection
    const tabParam = searchParams.get('tab');
    if (tabParam === 'cd-data') {
      setActiveTab('cd-data');
    } else {
      setActiveTab('items');
    }
    
    // Simple API test
    const testAPI = async () => {
      try {
        console.log('📡 Testing direct fetch from Home component...');
        const response = await fetch('http://localhost:8000/api/items/');
        const data = await response.json();
        console.log('✅ Direct API test successful:', data);
        setApiTest(`API works! Got ${data.length} items`);
      } catch (error) {
        console.error('❌ Direct API test failed:', error);
        setApiTest(`API failed: ${error}`);
      }
    };
    
    testAPI();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Hatzegopteryx</h1>
          <p className="text-slate-300 mt-2">
            Fullstack application with PostgreSQL, FastAPI, and Next.js
          </p>
          <p className="text-orange-300 mt-1 text-sm">
            API Test: {apiTest}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AppTabs activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as 'items' | 'cd-data')} />
        </div>

        <div className="mt-8">
          <div 
            role="tabpanel" 
            id="panel-items" 
            aria-labelledby="tab-items"
            className={activeTab === 'items' ? 'block' : 'hidden'}
          >
            <ItemsSection />
          </div>
          <div 
            role="tabpanel" 
            id="panel-cd-data" 
            aria-labelledby="tab-cd-data"
            className={activeTab === 'cd-data' ? 'block' : 'hidden'}
          >
            <CDDataSection />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}