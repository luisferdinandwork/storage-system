// app/dashboard/requests/layout.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  ClipboardList, 
  CheckSquare, 
  Truck, 
  RefreshCw, 
  AlertCircle,
  Package
} from 'lucide-react';

const navigation = [
  { 
    name: 'My Requests', 
    href: '/dashboard/requests/my-requests', 
    icon: ClipboardList, 
    roles: ['superadmin', 'manager', 'user'] 
  },
  { 
    name: 'Pending Approvals', 
    href: '/dashboard/requests/pending', 
    icon: CheckSquare, 
    roles: ['superadmin', 'storage-master', 'storage-master-manager', 'manager'] 
  },
  { 
    name: 'Active Loans', 
    href: '/dashboard/requests/active', 
    icon: Truck, 
    roles: ['superadmin', 'storage-master', 'storage-master-manager', 'manager', 'user'] 
  },
  { 
    name: 'Return Requests', 
    href: '/dashboard/requests/returns', 
    icon: RefreshCw, 
    roles: ['superadmin', 'storage-master', 'storage-master-manager', 'user'] 
  },
  { 
    name: 'Overdue Items', 
    href: '/dashboard/requests/overdue', 
    icon: AlertCircle, 
    roles: ['superadmin', 'storage-master', 'storage-master-manager', 'manager', 'user'] 
  },
  { 
    name: 'Seeding Items', 
    href: '/dashboard/requests/seeding', 
    icon: Package, 
    roles: ['superadmin', 'storage-master', 'storage-master-manager'] 
  },
];

export default function BorrowRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const filteredNavigation = navigation.filter(item => 
    session?.user?.role && item.roles.includes(session.user.role)
  );

  return (
      <div className="">
        {children}
      </div>
  );
}