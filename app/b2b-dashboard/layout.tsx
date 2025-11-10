'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/b2b-dashboard/sidebar';

export default function B2BDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}