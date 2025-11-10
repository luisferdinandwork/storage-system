'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaBoxOpen, FaShoppingCart, FaUsersCog, FaChartLine, FaFileInvoice, FaCog } from 'react-icons/fa';
import { IconType } from 'react-icons';

// Menu items data - easily add new items here
const MENU_ITEMS = [
  {
    id: 'sample-storage',
    title: 'Sample Storage',
    icon: FaBoxOpen,
    route: '/dashboard',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'b2b-item',
    title: 'B2B Item Input',
    icon: FaShoppingCart,
    route: '/b2b-dashboard',
    color: 'from-emerald-500 to-emerald-600'
  }
  // Uncomment to add more menu items
  // {
  //   id: 'user-management',
  //   title: 'User Management',
  //   icon: FaUsersCog,
  //   route: '/users',
  //   color: 'from-violet-500 to-violet-600'
  // },
  // {
  //   id: 'analytics',
  //   title: 'Analytics',
  //   icon: FaChartLine,
  //   route: '/analytics',
  //   color: 'from-amber-500 to-amber-600'
  // },
  // {
  //   id: 'invoicing',
  //   title: 'Invoicing',
  //   icon: FaFileInvoice,
  //   route: '/invoicing',
  //   color: 'from-rose-500 to-rose-600'
  // },
  // {
  //   id: 'settings',
  //   title: 'Settings',
  //   icon: FaCog,
  //   route: '/settings',
  //   color: 'from-slate-500 to-slate-600'
  // }
];

export default function MenuSelection() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!session) {
    router.push('/signin');
    return null;
  }

  const handleMenuSelect = async (menuItem: typeof MENU_ITEMS[0]) => {
    setIsLoading(true);
    setSelectedMenu(menuItem.id);
    
    // Simulate navigation delay for better UX
    setTimeout(() => {
      router.push(menuItem.route);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Panatrade Prestasi Internal Application
          </h1>
          <p className="text-gray-600 text-lg">
            Welcome, <span className="font-semibold text-primary-600">{session.user?.name}</span>
          </p>
          <p className="text-gray-500 mt-1">Select a system to access</p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-8">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedMenu === item.id;
            
            return (
              <div key={item.id} className="flex flex-col items-center">
                {/* Card */}
                <button
                  onClick={() => handleMenuSelect(item)}
                  disabled={isLoading}
                  className={`
                    w-16 aspect-square rounded-lg shadow-md
                    bg-gradient-to-br ${item.color}
                    hover:shadow-xl hover:scale-105
                    active:scale-95
                    transition-all duration-300
                    flex items-center justify-center
                    group relative overflow-hidden
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isSelected ? 'ring-4 ring-primary-400 ring-offset-2' : ''}
                  `}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Icon */}
                  <Icon className="text-white size-8 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  
                  {/* Loading spinner */}
                  {isSelected && isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                
                {/* Title */}
                <h3 className="mt-4 text-center font-semibold text-gray-900 text-sm">
                  {item.title}
                </h3>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm">
            Click on any card to access the system
          </p>
        </div>
      </div>
    </div>
  );
}