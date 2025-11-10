'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function B2BDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/b2b-dashboard/item-input');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to B2B Dashboard...</p>
      </div>
    </div>
  );
}