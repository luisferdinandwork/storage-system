// app/dashboard/(role)/storage-master/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { borrowRequests, itemStock, items, boxes, locations } from '@/lib/db/schema';
import { eq, count, and, gte, lte, isNull } from 'drizzle-orm';
import { Package, FileText, TrendingUp, AlertTriangle, BoxIcon } from 'lucide-react';
import PendingRequests from './PendingRequests';
import AlmostOverdueItems from './AlmostOverdueItems';
import StorageBoxes from './StorageBoxes';

export default async function StorageMasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'storage-master') {
    redirect('/auth/signin');
  }

  // Storage Master specific stats
  const pendingRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, 'pending_storage'));
    
  const totalItems = await db
    .select({ count: count() })
    .from(itemStock);
    
  const onBorrowItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(gte(itemStock.onBorrow, 1));
    
  const lowStockItems = await db
    .select({ count: count() })
    .from(itemStock)
    .where(lte(itemStock.inStorage, 5));

  const stats = [
    {
      name: 'Pending Requests',
      value: pendingRequests[0].count.toString(),
      icon: FileText,
      color: 'text-amber-500',
    },
    {
      name: 'Total Items',
      value: totalItems[0].count.toString(),
      icon: Package,
      color: 'text-primary-500',
    },
    {
      name: 'On Borrow',
      value: onBorrowItems[0].count.toString(),
      icon: TrendingUp,
      color: 'text-blue-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Storage Master Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PendingRequests />
        <AlmostOverdueItems />
      </div>

      <div className="mb-6">
        <StorageBoxes />
      </div>
    </div>
  );
}