'use client';

import { useState } from 'react';
import ItemsSection from '@/components/ItemsSection';
import CDDataSection from '@/components/CDDataSection';
import AppTabs from '@/components/AppTabs';
import Header from '@/components/auth/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'items' | 'cd-data'>('items');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <header className="bg-slate-800 text-white">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Hatzegopteryx</h1>
            <p className="text-slate-300 mt-2">
              Fullstack application with PostgreSQL, FastAPI, and Next.js
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <AppTabs activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as 'items' | 'cd-data')} />
          </div>

          <div className="mt-8">
            {activeTab === 'items' && <ItemsSection />}
            {activeTab === 'cd-data' && <CDDataSection />}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}