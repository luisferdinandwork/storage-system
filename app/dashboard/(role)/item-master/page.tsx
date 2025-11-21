// app/dashboard/(role)/item-master/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { items, users, itemRequests } from '@/lib/db/schema';
import { eq, count, and } from 'drizzle-orm';
import { Package, FileText, CheckCircle, XCircle } from 'lucide-react';
import PendingItems from './PendingItems';
import SeededItems from './SeededItems';
import ClearanceItems from './ClearanceItems';

export default async function ItemMasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'item-master') {
    redirect('/auth/signin');
  }

  // Item Master specific stats
  const createdItems = await db
    .select({ count: count() })
    .from(items)
    .where(eq(items.createdBy, session.user.id));
    
  const pendingItems = await db
    .select({ count: count() })
    .from(items)
    .where(and(
      eq(items.createdBy, session.user.id),
      eq(items.status, 'pending_approval')
    ));
    
  const approvedItems = await db
    .select({ count: count() })
    .from(items)
    .where(and(
      eq(items.createdBy, session.user.id),
      eq(items.status, 'approved')
    ));
    
  const rejectedItems = await db
    .select({ count: count() })
    .from(items)
    .where(and(
      eq(items.createdBy, session.user.id),
      eq(items.status, 'rejected')
    ));

  const stats = [
    {
      name: 'Items Created',
      value: createdItems[0].count.toString(),
      icon: Package,
      color: 'text-primary-500',
    },
    {
      name: 'Pending Approval',
      value: pendingItems[0].count.toString(),
      icon: FileText,
      color: 'text-amber-500',
    },
    {
      name: 'Approved Items',
      value: approvedItems[0].count.toString(),
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      name: 'Rejected Items',
      value: rejectedItems[0].count.toString(),
      icon: XCircle,
      color: 'text-red-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Item Master Dashboard</h1>
      
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

      <div className="grid grid-cols-1 gap-6 mb-6">
        <PendingItems />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeededItems />
        <ClearanceItems />
      </div>
    </div>
  );
}