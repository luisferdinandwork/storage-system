// components/dashboard/sidebar-wrapper.tsx
'use client';

import { Sidebar } from '@/components/dashboard/sidebar';

interface SidebarWrapperProps {
  userRole: string;
}

export function SidebarWrapper({ userRole }: SidebarWrapperProps) {
  return <Sidebar userRole={userRole} />;
}