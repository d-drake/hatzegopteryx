'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperuser?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireSuperuser = false 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (requireSuperuser && !user.is_superuser) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, router, requireSuperuser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user || (requireSuperuser && !user.is_superuser)) {
    return null;
  }

  return <>{children}</>;
}