// components/dashboard/sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  Settings,
  Building,
  LogOut,
  Archive,
  Truck,
  CheckSquare,
  AlertCircle,
  ClipboardList,
  Inbox,
  Send,
  RefreshCw,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Warehouse,
  Plus,
  MapPin,
  BarChart3,
  PlusIcon
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePendingItemRequestsCount, usePendingBorrowRequestsCount, useOverdueBorrowRequestsCount } from '@/components/notifications/pending-approval-notification';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface SidebarProps {
  userRole: string;
}

const navigation: NavigationItem[] = [
  // Dashboard - accessible to all roles
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home, 
    roles: ['superadmin', 'item-master', 'storage-master', 'storage-manager', 'manager', 'user'] 
  },
  
  // Items Management - different access levels for different roles
  { 
    name: 'Items', 
    href: '/dashboard/items', 
    icon: Package, 
    roles: ['superadmin', 'item-master', 'storage-master', 'storage-manager', 'manager', 'user'] 
  },
  
  // Storage Management - Storage Master and Storage Manager specific
  { 
    name: 'Warehousing', 
    href: '/dashboard/storage', 
    icon: Warehouse, 
    roles: ['superadmin', 'storage-master', 'storage-manager']
  },
  { 
    name: 'Inventory Locations', 
    href: '/dashboard/stock-locations', 
    icon: MapPin, 
    roles: ['superadmin', 'storage-master', 'storage-manager'] 
  },
  { 
    name: 'Inventory Clearance', 
    href: '/dashboard/clearance', 
    icon: Trash2, 
    roles: ['superadmin', 'storage-master', 'storage-manager'] 
  },
  
  // Lending Requests - different views for different roles
  { 
    name: 'New Lending Requests', 
    href: '/dashboard/requests/new-requests', 
    icon: Plus, 
    roles: ['superadmin', 'manager', 'user'] 
  },
  { 
    name: 'My Lending Requests', 
    href: '/dashboard/requests/my-requests', 
    icon: ClipboardList, 
    roles: ['superadmin', 'manager', 'user'] 
  },
  { 
    name: 'Pending List', 
    href: '/dashboard/requests/pending', 
    icon: CheckSquare, 
    roles: ['superadmin', 'storage-master', 'storage-manager', 'manager'] 
  },
  { 
    name: 'Active Lending', 
    href: '/dashboard/requests/active', 
    icon: Truck, 
    roles: ['superadmin', 'storage-master', 'storage-manager'] 
  },
  
  // Reports
  { 
    name: 'Reports', 
    href: '/dashboard/reports', 
    icon: BarChart3, 
    roles: ['superadmin', 'storage-manager'] 
  },
  
  // User Management - Superadmin only
  { 
    name: 'Departments', 
    href: '/dashboard/departments', 
    icon: Building, 
    roles: ['superadmin'] 
  },
  { 
    name: 'Users', 
    href: '/dashboard/users', 
    icon: Users, 
    roles: ['superadmin'] 
  },
  
  // Settings - Superadmin only
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Settings, 
    roles: ['superadmin'] 
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pendingItemRequestsCount = usePendingItemRequestsCount(userRole);
  const pendingBorrowRequestsCount = usePendingBorrowRequestsCount(userRole);

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  // Group navigation items by category
  const groupedNavigation = [
    {
      title: 'Main',
      items: filteredNavigation.filter(item => 
        ['Dashboard', 'Items', 'Add Item'].includes(item.name)
      ),
      show: true
    },
    {
      title: 'Inventory Management',
      items: filteredNavigation.filter(item => 
        ['Warehousing', 'Inventory Locations', 'Inventory Clearance'].includes(item.name)
      ),
      show: userRole === 'storage-master' || userRole === 'storage-manager' || userRole === 'superadmin'
    },
    {
      title: 'Lending Management',
      items: filteredNavigation.filter(item => 
        ['New Lending Requests','My Lending Requests', 'Pending List', 'Active Lending'].includes(item.name)
      ),
      show: true
    },
    {
      title: 'Administration',
      items: filteredNavigation.filter(item => 
        ['Reports', 'Departments', 'Users', 'Settings'].includes(item.name)
      ),
      show: userRole === 'superadmin' || userRole === 'storage-manager'
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'bg-white shadow-md h-screen flex flex-col fixed lg:relative z-40 transition-all duration-300',
            isCollapsed ? 'w-20' : 'w-64',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            {!isCollapsed && (
              <h1 className="text-2xl font-bold text-primary-500 truncate">
                Storage System
              </h1>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'hidden lg:flex p-1.5 hover:bg-gray-100 rounded-md transition-colors',
                isCollapsed && 'mx-auto'
              )}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-6 overflow-y-auto overflow-x-visible">
            <div className={cn('px-3', isCollapsed && 'px-2')}>
              {groupedNavigation.map((group, groupIndex) => (
                group.show && group.items.length > 0 && (
                  <div key={groupIndex} className="mb-6">
                    {!isCollapsed && (
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {group.title}
                      </h3>
                    )}
                    {isCollapsed && group.items.length > 0 && (
                      <div className="border-t border-gray-200 my-3" />
                    )}
                    <div className={cn('mt-2', isCollapsed && 'space-y-1')}>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || 
                                       (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        
                        // Show pending count badges for Warehousing and Pending List
                        const warehouseCount = item.name === 'Warehousing' ? pendingItemRequestsCount : 0;
                        const borrowRequestCount = item.name === 'Pending List' ? pendingBorrowRequestsCount : 0;
                        const badgeCount = warehouseCount > 0 ? warehouseCount : borrowRequestCount;
                        const showBadge = badgeCount > 0;

                        const linkContent = (
                          <>
                            <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                            {!isCollapsed && (
                              <div className="flex items-center justify-between flex-1">
                                <span>{item.name}</span>
                                {showBadge && (
                                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        );

                        return (
                          <div key={item.name} className="relative">
                            {isCollapsed ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Link
                                      href={item.href}
                                      onClick={() => setIsMobileOpen(false)}
                                      className={cn(
                                        'flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors w-full',
                                        isActive
                                          ? 'bg-primary-100 text-primary-700'
                                          : 'text-gray-700 hover:bg-gray-100'
                                      )}
                                    >
                                      <item.icon className="h-5 w-5" />
                                    </Link>
                                    {showBadge && (
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>{item.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Link
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                  'flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors justify-between relative',
                                  isActive
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                )}
                              >
                                {linkContent}
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t">
            {!isCollapsed ? (
              <>
                <div className="px-3 py-2 text-sm font-medium text-gray-700">
                  {session?.user?.name}
                  <span className="block text-xs text-gray-500 capitalize">
                    {userRole.replace('-', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 w-full transition-colors"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign out
                </button>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 w-full transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}