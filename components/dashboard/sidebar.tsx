'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  Settings,
  LogOut
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface SidebarProps {
  userRole: string;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'manager', 'user'] },
  { name: 'Items', href: '/dashboard/items', icon: Package, roles: ['admin', 'manager', 'user'] },
  { name: 'Borrow Requests', href: '/dashboard/requests', icon: FileText, roles: ['admin', 'manager', 'user'] },
  { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['admin'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin', 'manager'] },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="w-64 bg-white shadow-md">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-500">Storage System</h1>
      </div>
      <nav className="mt-6">
        <div className="px-3">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1',
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="absolute bottom-0 w-64 p-4">
        <div className="border-t border-gray-200 pt-4">
          <div className="px-3 py-2 text-sm font-medium text-gray-700">
            {session?.user?.name}
            <span className="block text-xs text-gray-500 capitalize">{userRole}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 w-full"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}