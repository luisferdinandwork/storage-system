// app/dashboard/storage-master-manager/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { borrowRequests, itemStock, items, users, departments } from '@/lib/db/schema';
import { eq, count, and, or, gte, lte } from 'drizzle-orm';
import { Package, FileText, TrendingUp, Users, Building, AlertTriangle } from 'lucide-react';

export default async function StorageMasterManagerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'storage-master-manager') {
    redirect('/auth/signin');
  }

  // Combined stats for Storage Master Manager
  const pendingManagerRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, 'pending_manager'));
    
  const pendingStorageRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, 'pending_storage'));
    
  const totalItems = await db
    .select({ count: count() })
    .from(itemStock);
    
  const inStorageItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(gte(itemStock.inStorage, 1));
    
  const onBorrowItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(gte(itemStock.onBorrow, 1));
    
  const lowStockItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(lte(itemStock.inStorage, 5));
    
  const totalUsers = await db
    .select({ count: count() })
    .from(users);
    
  const totalDepartments = await db
    .select({ count: count() })
    .from(departments);

  const stats = [
    {
      name: 'Pending Manager',
      value: pendingManagerRequests[0].count.toString(),
      icon: FileText,
      color: 'text-amber-500',
    },
    {
      name: 'Pending Storage',
      value: pendingStorageRequests[0].count.toString(),
      icon: FileText,
      color: 'text-red-500',
    },
    {
      name: 'Total Items',
      value: totalItems[0].count.toString(),
      icon: Package,
      color: 'text-primary-500',
    },
    {
      name: 'In Storage',
      value: inStorageItems[0].count.toString(),
      icon: Package,
      color: 'text-green-500',
    },
    {
      name: 'On Borrow',
      value: onBorrowItems[0].count.toString(),
      icon: TrendingUp,
      color: 'text-blue-500',
    },
    {
      name: 'Low Stock Items',
      value: lowStockItems[0].count.toString(),
      icon: AlertTriangle,
      color: 'text-red-500',
    },
    {
      name: 'Total Users',
      value: totalUsers[0].count.toString(),
      icon: Users,
      color: 'text-purple-500',
    },
    {
      name: 'Departments',
      value: totalDepartments[0].count.toString(),
      icon: Building,
      color: 'text-indigo-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Storage Master Manager Dashboard</h1>
      
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              Requests requiring your approval (Manager & Storage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Pending approvals list will be implemented here.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Storage Status</CardTitle>
            <CardDescription>
              Current storage utilization and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Storage status details will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}