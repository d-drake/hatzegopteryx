'use client';

import { useState } from 'react';
import ItemsSection from '@/components/ItemsSection';
import CDDataSection from '@/components/CDDataSection';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'items' | 'cd-data'>('items');

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('items')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Todo Items
              </button>
              <button
                onClick={() => setActiveTab('cd-data')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cd-data'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                CD Data Analytics
              </button>
            </nav>
          </div>
        </div>

        <div className="mt-8">
          {activeTab === 'items' && <ItemsSection />}
          {activeTab === 'cd-data' && <CDDataSection />}
        </div>
      </main>
    </div>
  );
}