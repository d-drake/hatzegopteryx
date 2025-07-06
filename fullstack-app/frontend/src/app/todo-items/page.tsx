"use client";

import ItemsSection from "@/components/ItemsSection";
import AppTabs from "@/components/AppTabs";
import Header from "@/components/auth/Header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function TodoItemsPage() {
  return (
    <ProtectedRoute requireSuperuser>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <header className="bg-slate-800 text-white">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Cloud Critical Dimension Hub</h1>
            <p className="text-slate-300 mt-2">To Do Items - Superuser Only</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <AppTabs />
          </div>

          <div className="mt-8">
            <ItemsSection />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
