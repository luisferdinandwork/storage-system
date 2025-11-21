// app/dashboard/(role)/superadmin/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { items, users, borrowRequests, departments, itemStock, locations, boxes, itemRequests, itemClearances, clearanceForms, stockMovements } from '@/lib/db/schema';
import { eq, count, isNull, or, and, gte, lte, desc } from 'drizzle-orm';
import { Package, FileText, Users, TrendingUp, Building, MapPin, BoxIcon, AlertTriangle, CheckCircle, XCircle, Clock, BarChart3, Settings, Database, Archive } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import SystemOverview from './SystemOverview';
import UserManagement from './UserManagement';
import ItemManagement from './ItemManagement';
import BorrowManagement from './BorrowManagement';
import StorageManagement from './StorageManagement';
import ClearanceManagement from './ClearanceManagement';

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'superadmin') {
    redirect('/auth/signin');
  }

  // System-wide stats
  const totalItems = await db.select({ count: count() }).from(items);
  const totalUsers = await db.select({ count: count() }).from(users);
  const totalDepartments = await db.select({ count: count() }).from(departments);
  const totalLocations = await db.select({ count: count() }).from(locations);
  const totalBoxes = await db.select({ count: count() }).from(boxes);
  
  const pendingRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(or(
      eq(borrowRequests.status, 'pending_manager'),
      eq(borrowRequests.status, 'pending_storage')
    ));
  
  const activeBorrows = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, 'active'));
    
  const pendingItems = await db
    .select({ count: count() })
    .from(items)
    .where(eq(items.status, 'pending_approval'));
    
  const approvedItems = await db
    .select({ count: count() })
    .from(items)
    .where(eq(items.status, 'approved'));
    
  const rejectedItems = await db
    .select({ count: count() })
    .from(items)
    .where(eq(items.status, 'rejected'));
    
  const lowStockItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(lte(itemStock.inStorage, 5));
    
  const seededItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(gte(itemStock.seeded, 1));
    
  const clearanceItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(gte(itemStock.inClearance, 1));
    
  const pendingClearanceForms = await db
    .select({ count: count() })
    .from(clearanceForms)
    .where(eq(clearanceForms.status, 'pending_approval'));
    
  const recentMovements = await db
    .select({ count: count() })
    .from(stockMovements)
    .where(gte(stockMovements.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))); // Last 7 days

  const stats = [
    {
      name: 'Total Items',
      value: totalItems[0].count.toString(),
      icon: Package,
      color: 'text-primary-500',
    },
    {
      name: 'Total Users',
      value: totalUsers[0].count.toString(),
      icon: Users,
      color: 'text-blue-500',
    },
    {
      name: 'Departments',
      value: totalDepartments[0].count.toString(),
      icon: Building,
      color: 'text-purple-500',
    },
    {
      name: 'Locations',
      value: totalLocations[0].count.toString(),
      icon: MapPin,
      color: 'text-green-500',
    },
    {
      name: 'Storage Boxes',
      value: totalBoxes[0].count.toString(),
      icon: BoxIcon,
      color: 'text-amber-500',
    },
    {
      name: 'Pending Requests',
      value: pendingRequests[0].count.toString(),
      icon: FileText,
      color: 'text-red-500',
    },
    {
      name: 'Active Borrows',
      value: activeBorrows[0].count.toString(),
      icon: TrendingUp,
      color: 'text-indigo-500',
    },
    {
      name: 'Pending Items',
      value: pendingItems[0].count.toString(),
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={['system-overview']} className="w-full">
        {/* System Overview Section */}
        <AccordionItem value="system-overview">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Overview
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SystemOverview 
              approvedItems={approvedItems[0].count}
              rejectedItems={rejectedItems[0].count}
              lowStockItems={lowStockItems[0].count}
              seededItems={seededItems[0].count}
              clearanceItems={clearanceItems[0].count}
              pendingClearanceForms={pendingClearanceForms[0].count}
              recentMovements={recentMovements[0].count}
            />
          </AccordionContent>
        </AccordionItem>

        {/* User Management Section */}
        <AccordionItem value="user-management">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <UserManagement />
          </AccordionContent>
        </AccordionItem>

        {/* Item Management Section */}
        <AccordionItem value="item-management">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Management
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ItemManagement />
          </AccordionContent>
        </AccordionItem>

        {/* Borrow Management Section */}
        <AccordionItem value="borrow-management">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Borrow Management
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <BorrowManagement />
          </AccordionContent>
        </AccordionItem>

        {/* Storage Management Section */}
        <AccordionItem value="storage-management">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <BoxIcon className="h-5 w-5" />
              Storage Management
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <StorageManagement />
          </AccordionContent>
        </AccordionItem>

        {/* Clearance Management Section */}
        <AccordionItem value="clearance-management">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Clearance Management
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ClearanceManagement />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}