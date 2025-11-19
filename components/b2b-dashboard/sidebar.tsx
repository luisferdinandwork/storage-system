'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  FaSearch, 
  FaBoxOpen, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import { signOut, useSession } from 'next-auth/react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  { 
    name: 'Item Input', 
    href: '/b2b-dashboard/item-input', 
    icon: FaSearch, 
  },
  { 
    name: 'Item Details', 
    href: '/b2b-dashboard/item-details', 
    icon: FaBoxOpen, 
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={`bg-white shadow-md h-screen flex flex-col fixed lg:relative z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isMobileOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
      </button>

      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-2xl font-bold text-primary-500 truncate">
            B2B Dashboard
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-md transition-colors"
        >
          {isCollapsed ? (
            <span className="text-lg">›</span>
          ) : (
            <span className="text-lg">‹</span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 overflow-y-auto">
        <div className={`px-3 ${isCollapsed ? 'px-2' : ''}`}>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t">
        {!isCollapsed ? (
          <>
            <div className="px-3 py-2 text-sm font-medium text-gray-700">
              {session?.user?.name}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 w-full transition-colors"
            >
              <FaSignOutAlt className="mr-3 h-5 w-5" />
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 w-full transition-colors"
          >
            <FaSignOutAlt className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}