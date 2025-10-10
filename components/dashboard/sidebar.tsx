// components/dashboard/sidebar.tsx
'use client';

import { useState } from 'react';
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
  BarChart3
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  userRole: string;
}

const navigation = [
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
  { 
    name: 'Add Item', 
    href: '/dashboard/items/add', 
    icon: Plus, 
    roles: ['superadmin', 'item-master'] 
  },
  
  // Storage Management - Storage Master and Storage Manager specific
  { 
    name: 'Storage Management', 
    href: '/dashboard/storage', 
    icon: Warehouse, 
    roles: ['superadmin', 'storage-master', 'storage-manager'] 
  },
  { 
    name: 'Item Locations', 
    href: '/dashboard/storage/locations', 
    icon: MapPin, 
    roles: ['superadmin', 'storage-master', 'storage-manager'] 
  },
  
  // Borrow Requests - different views for different roles
  { 
    name: 'My Borrow Requests', 
    href: '/dashboard/requests/my-requests', 
    icon: ClipboardList, 
    roles: ['superadmin', 'manager', 'user'] 
  },
  { 
    name: 'Pending Approvals', 
    href: '/dashboard/requests/pending', 
    icon: CheckSquare, 
    roles: ['superadmin', 'storage-master', 'storage-manager', 'manager'] 
  },
  { 
    name: 'Active Loans', 
    href: '/dashboard/requests/active', 
    icon: Truck, 
    roles: ['superadmin', 'storage-master', 'storage-manager', 'manager', 'user'] 
  },
  { 
    name: 'Return Requests', 
    href: '/dashboard/requests/returns', 
    icon: RefreshCw, 
    roles: ['superadmin', 'storage-master', 'storage-manager', 'user'] 
  },
  { 
    name: 'Overdue Items', 
    href: '/dashboard/requests/overdue', 
    icon: AlertCircle, 
    roles: ['superadmin', 'storage-master', 'storage-manager', 'manager', 'user'] 
  },
  
  // Inventory Management
  { 
    name: 'Inventory Clearance', 
    href: '/dashboard/clearance', 
    icon: Trash2, 
    roles: ['superadmin', 'storage-master', 'storage-manager'] 
  },
  { 
    name: 'Clearance History', 
    href: '/dashboard/clearance/history', 
    icon: Archive, 
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
      title: 'Storage',
      items: filteredNavigation.filter(item => 
        ['Storage Management', 'Item Locations'].includes(item.name)
      ),
      show: userRole === 'storage-master' || userRole === 'storage-manager' || userRole === 'superadmin'
    },
    {
      title: 'Borrow Management',
      items: filteredNavigation.filter(item => 
        ['My Borrow Requests', 'Pending Approvals', 'Active Loans', 'Return Requests', 'Overdue Items'].includes(item.name)
      ),
      show: true
    },
    {
      title: 'Inventory',
      items: filteredNavigation.filter(item => 
        ['Inventory Clearance', 'Clearance History'].includes(item.name)
      ),
      show: userRole === 'storage-master' || userRole === 'storage-manager' || userRole === 'superadmin'
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
                        
                        const linkContent = (
                          <>
                            <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                            {!isCollapsed && <span>{item.name}</span>}
                          </>
                        );

                        return (
                          <div key={item.name} className="relative">
                            {isCollapsed ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                  'flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors',
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