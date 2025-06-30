'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // Redirect all users (guests and authenticated non-superusers) to SPC Dashboard
    if (!user || !user.is_superuser) {
      router.push('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    } else {
      // Superusers can stay on home page but we'll still redirect to SPC Dashboard
      // since Todo Items will be accessible from the nav
      router.push('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    }
  }, [user, loading, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}